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

  it("silence produces nothing", async () => {
    const { pipeline, inserter } = setup("   ");
    expect(await pipeline.process(audio, "exact", {})).toEqual({ kind: "empty" });
    expect(inserter.inserted).toEqual([]);
  });
});
