import type { LlmProvider } from "./contracts/llm";
import type { TextInserter } from "./contracts/platform";
import type { DictionaryStore, HistoryStore } from "./contracts/store";
import type { SttProvider } from "./contracts/stt";
import { SubxError } from "./errors";
import { styleRewritePrompt } from "./prompts";
import { Router } from "./router";
import { applyRules } from "./rules";
import type { AppContext, AudioClip, Mode, SessionRecord } from "./types";

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
  | { kind: "inserted"; record: SessionRecord }
  | { kind: "command"; command: string; rest: string; context: AppContext }
  | { kind: "empty" };

/** Audio in → text at the cursor. Talks only to plug-point interfaces, never to a vendor or OS. */
export class Pipeline {
  private readonly deps: PipelineDeps;
  private readonly router: Router;

  constructor(deps: PipelineDeps) {
    this.deps = deps;
    this.router = deps.router ?? new Router();
  }

  async process(audio: AudioClip, mode: Mode, context: AppContext): Promise<Outcome> {
    const clock = stopwatch();

    const dictionary = await this.deps.dictionary.all();
    const transcript = await this.deps.stt.transcribe(audio, {
      vocabulary: dictionary.map((entry) => entry.word),
    });
    const sttMs = clock.lap();

    const text = applyRules(transcript.text, dictionary);
    const rulesMs = clock.lap();
    if (!text) return { kind: "empty" };

    const route = this.router.route(text, mode);
    if (route.kind === "command") {
      return { kind: "command", command: route.command, rest: route.rest, context };
    }

    const finalText = route.mode === "style" ? await this.rewrite(text, context) : text;
    const llmMs = clock.lap();

    await this.deps.inserter.insert(finalText);
    const insertMs = clock.lap();

    const record: SessionRecord = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      mode: route.mode,
      context,
      rawText: transcript.text,
      finalText,
      timings: { sttMs, rulesMs, llmMs, insertMs, totalMs: clock.total() },
    };
    await this.deps.history.save(record);
    return { kind: "inserted", record };
  }

  private async rewrite(text: string, context: AppContext): Promise<string> {
    if (!this.deps.llm) throw new SubxError("unsupported", "Style mode needs an LLM provider");
    const response = await this.deps.llm.complete({
      system: styleRewritePrompt(context),
      messages: [{ role: "user", content: text }],
    });
    return response.text.trim();
  }
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
