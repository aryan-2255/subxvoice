import type { LlmProvider } from "./contracts/llm";
import type { TextInserter } from "./contracts/platform";
import type { DictionaryStore, HistoryStore } from "./contracts/store";
import type { SttProvider, Transcript } from "./contracts/stt";
import { SubxError } from "./errors";
import { needsTransliteration, styleRewritePrompt, transliteratePrompt } from "./prompts";
import { Router } from "./router";
import { applyRules } from "./rules";
import type { AppContext, AudioClip, Mode, ScriptPreference, SessionRecord } from "./types";

export interface PipelineDeps {
  stt: SttProvider;
  /** Needed for style mode only. */
  llm?: LlmProvider;
  inserter: TextInserter;
  history: HistoryStore;
  dictionary: DictionaryStore;
  router?: Router;
}

export type Outcome =
  /** `pasteError` is set when the text could not be typed; the dictation is still saved to history. */
  | { kind: "inserted"; record: SessionRecord; pasteError?: string }
  | { kind: "command"; command: string; rest: string; context: AppContext }
  | { kind: "empty" };

export interface ProcessOptions {
  /** Read from settings on every dictation, so changing it takes effect immediately. */
  script?: ScriptPreference;
  /** Shown while the LLM is still working, so the pill can display the raw words first. */
  onTranscript?: (text: string) => void;
}

/**
 * A dictation in progress. Audio is pushed in as the user speaks; `finish` returns the final
 * outcome once they let go. This is what keeps release→paste fast: with a streaming STT plug the
 * words are recognised live, so only the last fragment is still outstanding at release.
 */
export interface DictationSession {
  /** Feed a chunk of 16 kHz mono PCM. Safe to call before the stream has finished opening. */
  push(samples: Int16Array): void;
  /** Stop, transcribe the rest, run rules/router/LLM, insert, and record. */
  finish(): Promise<Outcome>;
  /** Partial text recognised so far, for a live preview. "" until the plug reports something. */
  partial(): string;
}

/** Audio in → text at the cursor. Talks only to plug-point interfaces, never to a vendor or OS. */
export class Pipeline {
  private readonly deps: PipelineDeps;
  private readonly router: Router;

  constructor(deps: PipelineDeps) {
    this.deps = deps;
    this.router = deps.router ?? new Router();
  }

  /**
   * Opens a streaming dictation. The STT stream (and its websocket) is opened now, so by the time
   * the user lets go it is warm and only the tail of the audio is left to finalise.
   */
  async open(mode: Mode, context: AppContext, options: ProcessOptions = {}): Promise<DictationSession> {
    const dictionary = await this.deps.dictionary.all();
    const vocabulary = dictionary.map((entry) => entry.word);

    // Prefer the live stream; fall back to buffering for plugs that only do batch (e.g. the fake).
    const stream = this.deps.stt.startStream ? await this.deps.stt.startStream({ vocabulary }) : null;
    const buffered: Int16Array[] = [];

    return {
      push: (samples) => {
        if (stream) stream.push(samples);
        else buffered.push(samples);
      },
      partial: () => stream?.partial() ?? "",
      finish: async () => {
        // Clock starts at finish(), i.e. key-release: this is the tail the user actually waits on,
        // not the time already spent streaming while they spoke.
        const clock = stopwatch();
        const transcript: Transcript = stream
          ? await stream.finish()
          : await this.deps.stt.transcribe({ samples: concat(buffered), sampleRate: 16000 }, { vocabulary });
        return this.complete(transcript, mode, context, dictionary, options, clock.lap());
      },
    };
  }

  /** Batch entry point: the whole clip at once. Kept for tests and non-streaming callers. */
  async process(
    audio: AudioClip,
    mode: Mode,
    context: AppContext,
    options: ProcessOptions = {},
  ): Promise<Outcome> {
    const session = await this.open(mode, context, options);
    session.push(audio.samples);
    return session.finish();
  }

  /** Everything after speech-to-text: dictionary rules, routing, the LLM, insertion and history. */
  private async complete(
    transcript: Transcript,
    mode: Mode,
    context: AppContext,
    dictionary: Awaited<ReturnType<DictionaryStore["all"]>>,
    options: ProcessOptions,
    sttMs: number,
  ): Promise<Outcome> {
    const clock = stopwatch();
    const script = options.script ?? "roman";

    const text = applyRules(transcript.text, dictionary);
    const rulesMs = clock.lap();
    if (!text) return { kind: "empty" };
    options.onTranscript?.(text);

    const route = this.router.route(text, mode);
    if (route.kind === "command") {
      return { kind: "command", command: route.command, rest: route.rest, context };
    }

    // At most one LLM call: style mode folds the script rule into its own prompt.
    const finalText =
      route.mode === "style"
        ? await this.rewrite(text, context, script)
        : await this.transliterate(text, script);
    const llmMs = clock.lap();

    // A failed paste must never lose what the user said: record it anyway and report the error.
    let pasteError: string | undefined;
    try {
      await this.deps.inserter.insert(finalText);
    } catch (error) {
      pasteError = error instanceof Error ? error.message : String(error);
    }
    const insertMs = clock.lap();

    const record: SessionRecord = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      mode: route.mode,
      context,
      rawText: transcript.text,
      finalText,
      timings: { sttMs, rulesMs, llmMs, insertMs, totalMs: sttMs + clock.total() },
    };
    await this.deps.history.save(record);
    return pasteError ? { kind: "inserted", record, pasteError } : { kind: "inserted", record };
  }

  private async rewrite(text: string, context: AppContext, script: ScriptPreference): Promise<string> {
    if (!this.deps.llm) throw new SubxError("unsupported", "Style mode needs an LLM provider");
    const response = await this.deps.llm.complete({
      system: styleRewritePrompt(context, script),
      messages: [{ role: "user", content: text }],
    });
    return response.text.trim();
  }

  /**
   * Exact mode with a Roman script preference. The user's own words are never lost: if the model
   * is missing or fails, the text goes in as it was heard.
   */
  private async transliterate(text: string, script: ScriptPreference): Promise<string> {
    if (!this.deps.llm || !needsTransliteration(text, script)) return text;
    try {
      const response = await this.deps.llm.complete({
        system: transliteratePrompt(),
        messages: [{ role: "user", content: text }],
      });
      return response.text.trim() || text;
    } catch {
      return text;
    }
  }
}

function concat(chunks: Int16Array[]): Int16Array {
  const out = new Int16Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function stopwatch() {
  const start = performance.now();
  let last = start;
  return {
    lap() {
      const now = performance.now();
      const ms = Math.round(now - last);
      last = now;
      return ms;
    },
    total: () => Math.round(performance.now() - start),
  };
}
