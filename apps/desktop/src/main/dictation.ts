import type { AudioClip, HotkeyEvent, Mode } from "@subx/core";
import type { PillState } from "../shared/ipc";
import type { MicSource } from "./mic";
import type { PillWindow } from "./pill";

export const SAMPLE_RATE = 16000;
const MIN_HOLD_MS = 250; // a shorter press is an accidental tap
const RESULT_VISIBLE_MS = 1500;

/**
 * One dictation in flight. The engine opens an STT stream the moment the key goes down, so audio is
 * recognised while the user speaks and only the tail is left to finalise on release.
 */
export interface DictationRun {
  /** Feed a chunk of 16 kHz mono PCM. */
  push(samples: Int16Array): void;
  /** Finalise: `clip` is the whole recording, kept for history audio. Returns the pill message. */
  finish(clip: AudioClip): Promise<string>;
  /** Discard without typing anything. */
  cancel(): void;
}

export interface DictationEngine {
  /** Open a session for one dictation. Called on key-press. */
  open(mode: Mode): Promise<DictationRun>;
}

/** Turns hotkey events into pill states, streaming audio to the engine as the user speaks. */
export class DictationController {
  private readonly pill: PillWindow;
  private readonly mic: MicSource;
  private readonly engine: DictationEngine;
  private state: "idle" | "listening" | "processing" = "idle";
  private mode: Mode = "exact";
  private pressedAt = 0;
  private chunks: Int16Array[] = [];
  /** Audio captured before the STT stream finished opening; flushed once it is ready. */
  private pending: Int16Array[] = [];
  private run: DictationRun | null = null;
  private opening: Promise<void> = Promise.resolve();
  private resetTimer: NodeJS.Timeout | undefined;

  constructor(pill: PillWindow, mic: MicSource, engine: DictationEngine) {
    this.pill = pill;
    this.mic = mic;
    this.engine = engine;
  }

  handleHotkey(event: HotkeyEvent): void {
    if (event.type === "pressed" && this.state === "idle") this.start(event.mode);
    else if (event.type === "released" && this.state === "listening") void this.finish();
    else if (event.type === "cancel" && this.state === "listening") void this.cancel();
  }

  private start(mode: Mode): void {
    clearTimeout(this.resetTimer);
    this.state = "listening";
    this.mode = mode;
    this.pressedAt = Date.now();
    this.chunks = [];
    this.pending = [];
    this.run = null;
    this.pill.moveToCursorScreen();
    this.pill.setState({ kind: "listening" });

    // Open the STT stream and the mic together, so neither waits on the other. Chunks that arrive
    // before the stream is ready are held in `pending` and flushed the moment it opens.
    this.opening = this.engine
      .open(mode)
      .then((run) => {
        if (this.state === "idle") {
          run.cancel(); // cancelled during the ~200 ms open
          return;
        }
        this.run = run;
        for (const chunk of this.pending) run.push(chunk);
        this.pending = [];
      })
      .catch((error: unknown) => this.failOpen(error));

    this.mic
      .start((samples) => {
        this.chunks.push(samples);
        this.pill.level(rms(samples));
        if (this.run) this.run.push(samples);
        else this.pending.push(samples);
      })
      .catch((error: unknown) => {
        if (this.state !== "listening") return;
        this.chunks = [];
        this.showResult({ kind: "error", message: message(error) });
      });
  }

  private async finish(): Promise<void> {
    if (Date.now() - this.pressedAt < MIN_HOLD_MS) {
      await this.cancel();
      return;
    }
    this.state = "processing";
    this.pill.setState({ kind: "processing" });
    await this.mic.stop();
    await this.opening; // make sure the stream finished opening (or failed)

    const clip: AudioClip = { samples: concat(this.chunks), sampleRate: SAMPLE_RATE };
    this.chunks = [];
    const run = this.run;
    this.run = null;
    if (!run) return; // open failed; failOpen already showed the error

    try {
      this.showResult({ kind: "done", message: await run.finish(clip) });
    } catch (error) {
      this.showResult({ kind: "error", message: message(error) });
    }
  }

  private async cancel(): Promise<void> {
    this.state = "idle";
    this.pill.setState({ kind: "idle" });
    await this.mic.stop();
    await this.opening;
    this.run?.cancel();
    this.run = null;
    this.chunks = [];
    this.pending = [];
  }

  private failOpen(error: unknown): void {
    if (this.state === "idle") return;
    this.run = null;
    this.pending = [];
    void this.mic.stop();
    this.showResult({ kind: "error", message: message(error) });
  }

  /** Shows the result briefly; a new dictation can start right away. */
  private showResult(state: PillState): void {
    this.state = "idle";
    this.pill.setState(state);
    this.resetTimer = setTimeout(() => this.pill.setState({ kind: "idle" }), RESULT_VISIBLE_MS);
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function rms(samples: Int16Array): number {
  let sumSquares = 0;
  for (const sample of samples) sumSquares += (sample / 32768) ** 2;
  return Math.sqrt(sumSquares / Math.max(1, samples.length));
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
