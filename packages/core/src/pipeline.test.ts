import { describe, expect, it } from "vitest";
import { FakeInserter, FakeLlm, FakeStt, MemoryDictionary, MemoryHistory } from "./fakes";
import { Pipeline } from "./pipeline";

const audio = { samples: new Int16Array(16000), sampleRate: 16000 };

function setup(spoken: string, llm?: FakeLlm) {
  const inserter = new FakeInserter();
  const history = new MemoryHistory();
  const pipeline = new Pipeline({
    stt: new FakeStt(spoken),
    llm,
    inserter,
    history,
    dictionary: new MemoryDictionary([{ word: "SUBXVoice", misheardAs: ["sub x voice"] }]),
  });
  return { pipeline, inserter, history };
}

describe("Pipeline", () => {
  it("exact mode: applies the dictionary, inserts, and saves history", async () => {
    const { pipeline, inserter, history } = setup("testing sub x voice today");

    const outcome = await pipeline.process(audio, "exact", { appName: "Notes" });

    expect(inserter.inserted).toEqual(["testing SUBXVoice today"]);
    expect(outcome.kind).toBe("inserted");
    expect(history.records[0]?.rawText).toBe("testing sub x voice today");
    expect(history.records[0]?.context.appName).toBe("Notes");
  });

  it("style mode: sends the cleaned text to the LLM and inserts its reply", async () => {
    const llm = new FakeLlm("I won't be able to come today.");
    const { pipeline, inserter } = setup("umm i wont be able to come today", llm);

    await pipeline.process(audio, "style", { appName: "Slack" });

    expect(inserter.inserted).toEqual(["I won't be able to come today."]);
    expect(llm.requests[0]?.system).toContain("Slack");
  });

  it("style mode without an LLM fails instead of guessing", async () => {
    const { pipeline } = setup("hello");
    await expect(pipeline.process(audio, "style", {})).rejects.toThrow("LLM");
  });

  it("commands are returned to the caller, not typed", async () => {
    const { pipeline, inserter } = setup("write a mail to the professor about the deadline");

    const outcome = await pipeline.process(audio, "exact", {});

    expect(outcome).toMatchObject({ kind: "command", command: "email" });
    expect(inserter.inserted).toEqual([]);
  });

  it("keeps the dictation in history when pasting fails", async () => {
    const { pipeline, inserter, history } = setup("testing sub x voice today");
    inserter.insert = async () => {
      throw new Error("no paste permission");
    };

    const outcome = await pipeline.process(audio, "exact", {});

    expect(outcome).toMatchObject({ kind: "inserted", pasteError: "no paste permission" });
    expect(history.records[0]?.finalText).toBe("testing SUBXVoice today");
  });

  it("silence produces nothing", async () => {
    const { pipeline, inserter } = setup("   ");
    expect(await pipeline.process(audio, "exact", {})).toEqual({ kind: "empty" });
    expect(inserter.inserted).toEqual([]);
  });

  it("reports the raw transcript before the model has rewritten it", async () => {
    const llm = new FakeLlm("main theek hoon");
    const { pipeline } = setup("मैं ठीक हूँ", llm);
    const seen: string[] = [];

    await pipeline.process(audio, "exact", {}, { script: "roman", onTranscript: (t) => seen.push(t) });

    expect(seen).toEqual(["मैं ठीक हूँ"]);
  });

  describe("Roman script preference", () => {
    it("transliterates non-Latin speech in exact mode", async () => {
      const llm = new FakeLlm("main theek hoon");
      const { pipeline, inserter } = setup("मैं ठीक हूँ", llm);

      await pipeline.process(audio, "exact", {}, { script: "roman" });

      expect(inserter.inserted).toEqual(["main theek hoon"]);
      expect(llm.requests[0]?.system).toMatch(/transliteration/i);
    });

    it("transliterates by default (Roman is the out-of-the-box behaviour)", async () => {
      const llm = new FakeLlm("main theek hoon");
      const { pipeline, inserter } = setup("मैं ठीक हूँ", llm);

      await pipeline.process(audio, "exact", {}); // no script option

      expect(inserter.inserted).toEqual(["main theek hoon"]);
    });

    it("keeps the native script when explicitly asked", async () => {
      const llm = new FakeLlm("main theek hoon");
      const { pipeline, inserter } = setup("मैं ठीक हूँ", llm);

      await pipeline.process(audio, "exact", {}, { script: "native" });

      expect(inserter.inserted).toEqual(["मैं ठीक हूँ"]);
      expect(llm.requests).toEqual([]);
    });

    it("costs nothing when the speech was already in Latin letters", async () => {
      const llm = new FakeLlm("should not be called");
      const { pipeline, inserter } = setup("hello there", llm);

      await pipeline.process(audio, "exact", {}, { script: "roman" });

      expect(inserter.inserted).toEqual(["hello there"]);
      expect(llm.requests).toEqual([]);
    });

    // The user's words are the one thing we must never lose.
    it("inserts the original when the model fails", async () => {
      const llm = new FakeLlm("");
      llm.complete = async () => {
        throw new Error("provider down");
      };
      const { pipeline, inserter } = setup("मैं ठीक हूँ", llm);

      await pipeline.process(audio, "exact", {}, { script: "roman" });

      expect(inserter.inserted).toEqual(["मैं ठीक हूँ"]);
    });

    it("style mode folds the script into its single call", async () => {
      const llm = new FakeLlm("Main theek hoon.");
      const { pipeline, inserter } = setup("मैं ठीक हूँ", llm);

      await pipeline.process(audio, "style", {}, { script: "roman" });

      expect(inserter.inserted).toEqual(["Main theek hoon."]);
      expect(llm.requests).toHaveLength(1);
      expect(llm.requests[0]?.system).toMatch(/Latin letters/);
    });
  });

  describe("streaming session", () => {
    // FakeStt has no startStream, so open() must buffer and fall back to transcribe().
    it("buffers pushes and finalises on a batch-only plug", async () => {
      const { pipeline, inserter } = setup("testing sub x voice today");

      const session = await pipeline.open("exact", { appName: "Notes" });
      session.push(audio.samples.subarray(0, 8000));
      session.push(audio.samples.subarray(8000));
      const outcome = await session.finish();

      expect(outcome.kind).toBe("inserted");
      expect(inserter.inserted).toEqual(["testing SUBXVoice today"]);
    });

    it("uses the plug's live stream when it has one", async () => {
      const pushed: Int16Array[] = [];
      let batchUsed = false;
      const stt = {
        id: "streamy",
        capabilities: { streaming: true, codeSwitching: true, vocabularyHints: true },
        transcribe: async () => {
          batchUsed = true;
          return { text: "should not be used", languages: [] };
        },
        startStream: async () => ({
          push: (s: Int16Array) => pushed.push(s),
          partial: () => "partial so far",
          finish: async () => ({ text: "streamed words", languages: [] }),
        }),
      };
      const inserter = new FakeInserter();
      const pipeline = new Pipeline({
        stt,
        inserter,
        history: new MemoryHistory(),
        dictionary: new MemoryDictionary([]),
      });

      const session = await pipeline.open("exact", {});
      session.push(audio.samples);
      expect(session.partial()).toBe("partial so far");
      await session.finish();

      expect(pushed).toHaveLength(1); // went to the stream, not the buffer
      expect(inserter.inserted).toEqual(["streamed words"]);
      expect(batchUsed).toBe(false); // transcribe() was never touched
    });
  });
});
