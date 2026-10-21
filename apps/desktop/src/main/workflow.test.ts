import { Pipeline } from "@subx/core";
import { FakeInserter, FakeLlm, FakeStt, MemoryDictionary, MemoryHistory } from "@subx/core/fakes";
import { describe, expect, it } from "vitest";
import type { AppSettings } from "../shared/ipc";
import { createWorkflow, type WorkflowDeps } from "./workflow";

const clip = { samples: new Int16Array(16000), sampleRate: 16000 };

function build(opts: {
  spoken?: string;
  reply?: string;
  script?: AppSettings["script"];
  withPipeline?: boolean;
  problems?: string[];
}) {
  const inserter = new FakeInserter();
  const history = new MemoryHistory();
  const saved: string[] = [];
  const heard: string[] = [];
  let changes = 0;

  const pipeline =
    opts.withPipeline === false
      ? null
      : new Pipeline({
          stt: new FakeStt(opts.spoken ?? "hello world"),
          llm: new FakeLlm(opts.reply ?? "formatted"),
          inserter,
          history,
          dictionary: new MemoryDictionary([]),
        });

  const deps: WorkflowDeps = {
    pipeline,
    problems: opts.problems ?? [],
    settings: { all: async () => ({ hotkey: "ctrl+win", script: opts.script ?? "roman", microphoneId: "" }) },
    context: { current: async () => ({ appName: "Notes" }) },
    history: {
      save: (record) => history.save(record),
      attachAudio: async (id, path) => {
        saved.push(`${id}:${path}`);
      },
    },
    saveRecording: async () => "/tmp/rec.wav",
    newId: () => "fixed-id",
    onHeard: (text) => heard.push(text),
    onHistoryChanged: () => {
      changes++;
    },
  };

  return { workflow: createWorkflow(deps), inserter, history, saved, heard, changes: () => changes };
}

describe("createWorkflow", () => {
  it("runs the full chain and types the final text", async () => {
    const { workflow, inserter } = build({ spoken: "hi there", reply: "Hi there." });
    const run = await workflow.open("style");
    run.push(clip.samples);
    const message = await run.finish(clip);

    expect(inserter.inserted).toEqual(["Hi there."]);
    expect(message).toBe("Hi there.");
  });

  it("shows the raw words before the model has formatted them", async () => {
    const { workflow, heard } = build({ spoken: "मुझे कल जाना है", reply: "mujhe kal jaana hai" });
    const run = await workflow.open("exact");
    run.push(clip.samples);
    await run.finish(clip);

    expect(heard).toEqual(["मुझे कल जाना है"]);
  });

  it("saves audio to history after the text is typed", async () => {
    const { workflow, saved, history } = build({ spoken: "note this" });
    const run = await workflow.open("exact");
    await run.finish(clip);
    await Promise.resolve(); // let the fire-and-forget audio save settle

    expect(history.records).toHaveLength(1);
    expect(saved).toEqual([`${history.records[0]?.id}:/tmp/rec.wav`]);
  });

  it("reports silence without touching the cursor", async () => {
    const { workflow, inserter } = build({ spoken: "   " });
    const run = await workflow.open("exact");
    const message = await run.finish(clip);

    expect(message).toBe("Nothing heard");
    expect(inserter.inserted).toEqual([]);
  });

  it("surfaces a command instead of typing it", async () => {
    const { workflow, inserter } = build({ spoken: "write a mail to the team" });
    const run = await workflow.open("exact");
    const message = await run.finish(clip);

    expect(message).toBe("Command: email");
    expect(inserter.inserted).toEqual([]);
  });

  // No STT configured: the user must still get their audio back and a clear reason.
  it("keeps the recording and explains when speech-to-text is off", async () => {
    const { workflow, history, saved } = build({
      withPipeline: false,
      problems: ["Speech-to-text is off: SONIOX_API_KEY is not set."],
    });
    const run = await workflow.open("exact");
    const message = await run.finish(clip);
    await Promise.resolve();

    expect(message).toBe("Speech-to-text is off: SONIOX_API_KEY is not set.");
    expect(history.records).toHaveLength(1);
    expect(history.records[0]?.finalText).toBe("");
    expect(saved).toHaveLength(1);
  });

  it("drains the stream on cancel without typing", async () => {
    const { workflow, inserter } = build({ spoken: "discard me" });
    const run = await workflow.open("exact");
    run.push(clip.samples);
    run.cancel();
    await Promise.resolve();

    expect(inserter.inserted).toEqual([]);
  });
});
