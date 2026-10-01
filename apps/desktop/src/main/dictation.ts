import type { AudioClip, HotkeyEvent, Mode } from "@subx/core";
import type { PillState } from "../shared/ipc";
import type { MicSource } from "./mic";
import type { PillWindow } from "./pill";

export const SAMPLE_RATE = 16000;
const MIN_HOLD_MS = 250; // a shorter press is an accidental tap
const RESULT_VISIBLE_MS = 1500;

/** Called with every finished recording; returns the short message the pill shows. */
export type ClipHandler = (clip: AudioClip, mode: Mode) => Promise<string>;

/** Turns hotkey events into pill states and a recorded clip. */
export class DictationController {
  private readonly pill: PillWindow;
  private readonly mic: MicSource;
  private readonly onClip: ClipHandler;
  private state: "idle" | "listening" | "processing" = "idle";
  private mode: Mode = "exact";
  private pressedAt = 0;
  private chunks: Int16Array[] = [];
  private resetTimer: NodeJS.Timeout | undefined;

  constructor(pill: PillWindow, mic: MicSource, onClip: ClipHandler) {
    this.pill = pill;
    this.mic = mic;
    this.onClip = onClip;
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
    this.pill.moveToCursorScreen();
    this.pill.setState({ kind: "listening" });
    this.mic
      .start((samples) => {
        this.chunks.push(samples);
        this.pill.level(rms(samples));
      })
      .catch((error: unknown) => {
        if (this.state !== "listening") return;
        this.chunks = [];
        this.showResult({ kind: "error", message: error instanceof Error ? error.message : String(error) });
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

    const clip: AudioClip = { samples: concat(this.chunks), sampleRate: SAMPLE_RATE };
    this.chunks = [];
    try {
      this.showResult({ kind: "done", message: await this.onClip(clip, this.mode) });
    } catch (error) {
      this.showResult({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  private async cancel(): Promise<void> {
    this.state = "idle";
    this.pill.setState({ kind: "idle" });
    await this.mic.stop();
    this.chunks = [];
  }

  /** Shows the result briefly; a new dictation can start right away. */
  private showResult(state: PillState): void {
    this.state = "idle";
    this.pill.setState(state);
    this.resetTimer = setTimeout(() => this.pill.setState({ kind: "idle" }), RESULT_VISIBLE_MS);
  }
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
