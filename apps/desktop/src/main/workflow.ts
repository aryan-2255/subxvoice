// The dictation workflow: one place that owns what happens between the key going down and the
// text landing at the cursor.
//
//   key down ──► open STT stream ──► stream audio while speaking
//   key up   ──► finalise STT ──► rules ──► router ──► LLM (script / style) ──► paste ──► history
//
// The controller above it only knows about the hotkey, the pill and the microphone; the pipeline
// below it only knows about plug-point interfaces. Everything app-specific — which settings apply,
// what the pill says, where the audio file goes, what a failure reads like — lives here.
import type { AppContext, AudioClip, ContextReader, Mode, Pipeline, SessionRecord } from "@subx/core";
import type { AppSettings } from "../shared/ipc";
import type { DictationEngine, DictationRun } from "./dictation";

export interface WorkflowDeps {
  /** Null when no speech-to-text engine is configured; the workflow then just keeps the audio. */
  pipeline: Pipeline | null;
  /** Why an engine is missing, surfaced to the user instead of a silent no-op. */
  problems: string[];
  settings: { all(): Promise<AppSettings> };
  context: ContextReader;
  history: {
    save(record: SessionRecord): Promise<void>;
    attachAudio(id: string, audioPath: string, audioMs: number): Promise<void>;
  };
  saveRecording(clip: AudioClip): Promise<string>;
  newId(): string;
  /** Raw words as heard, shown while the model is still formatting them. */
  onHeard(text: string): void;
  onHistoryChanged(): void;
  log?(line: string): void;
}

export function createWorkflow(deps: WorkflowDeps): DictationEngine {
  return {
    async open(mode: Mode): Promise<DictationRun> {
      // Settings are read per dictation, so changing the script takes effect on the next one.
      const settings = await deps.settings.all();
      const context = await deps.context.current().catch(() => ({}) as AppContext);

      if (!deps.pipeline) return keepAudioOnly(deps, mode);

      // Opening here, on key-press, is what keeps release→paste short: the socket is already
      // warm and the words are recognised while the user is still speaking.
      const session = await deps.pipeline.open(mode, context, {
        script: settings.script,
        onTranscript: deps.onHeard,
      });

      return {
        push: (samples) => session.push(samples),
        finish: async (clip) => {
          const outcome = await session.finish();

          if (outcome.kind === "empty") {
            deps.log?.("dictation: nothing heard");
            return "Nothing heard";
          }
          if (outcome.kind === "command") {
            deps.log?.(`dictation: command "${outcome.command}"`);
            return `Command: ${outcome.command}`;
          }

          const { record } = outcome;
          deps.onHistoryChanged();
          // The text is already at the cursor; the recording is written afterwards so disk I/O
          // never sits on the user's critical path.
          void keepAudio(deps, clip, record.id);
          deps.log?.(summarise(record, settings.script, outcome.pasteError));
          // The transcript is saved either way; a failed paste is surfaced so the pill shows why
          // nothing appeared, rather than silently doing nothing.
          if (outcome.pasteError) throw new Error(outcome.pasteError);
          return record.finalText;
        },
        cancel: () => {
          // Drain the stream so the socket closes rather than leaking; the result is discarded.
          void session.finish().catch(() => {});
        },
      };
    },
  };
}

/** No speech-to-text configured: still record, so nothing the user said is thrown away. */
function keepAudioOnly(deps: WorkflowDeps, mode: Mode): DictationRun {
  return {
    push: () => {},
    finish: async (clip) => {
      const record: SessionRecord = {
        id: deps.newId(),
        createdAt: Date.now(),
        mode,
        context: {},
        rawText: "",
        finalText: "",
        audioMs: durationMs(clip),
        timings: { sttMs: 0, rulesMs: 0, llmMs: 0, insertMs: 0, totalMs: 0 },
      };
      await deps.history.save(record);
      await keepAudio(deps, clip, record.id);
      return deps.problems[0] ?? "Speech-to-text is not configured";
    },
    cancel: () => {},
  };
}

async function keepAudio(deps: WorkflowDeps, clip: AudioClip, id: string): Promise<void> {
  try {
    await deps.history.attachAudio(id, await deps.saveRecording(clip), durationMs(clip));
    deps.onHistoryChanged();
  } catch (error) {
    deps.log?.(`dictation: could not save audio — ${message(error)}`);
  }
}

const durationMs = (clip: AudioClip) => Math.round((clip.samples.length / clip.sampleRate) * 1000);

/** One line per dictation, so a wrong script or a slow stage is obvious without a debugger. */
function summarise(record: SessionRecord, script: AppSettings["script"], pasteError?: string): string {
  const { sttMs, llmMs, insertMs, totalMs } = record.timings;
  const changed = record.rawText !== record.finalText;
  const tail = pasteError
    ? ` | PASTE FAILED: ${pasteError}`
    : ` | stt ${sttMs}ms · llm ${llmMs}ms · insert ${insertMs}ms · total ${totalMs}ms`;
  return `dictation [${script}]: "${record.rawText}"${changed ? ` → "${record.finalText}"` : " (unchanged)"}${tail}`;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));
