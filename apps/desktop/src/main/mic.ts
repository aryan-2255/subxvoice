import type { Microphone } from "@subx/core";
import type { PillWindow } from "./pill";

const PILL_FLUSH_TIMEOUT_MS = 1000;

/** Where recordings come from. Chunks are 16 kHz mono PCM. */
export interface MicSource {
  start(onChunk: (samples: Int16Array) => void): Promise<void>;
  /** Resolves once every chunk has been delivered. */
  stop(): Promise<void>;
}

/** The OS's native microphone plug (e.g. the Swift helper on Mac). */
export function nativeMic(microphone: Microphone): MicSource {
  return {
    start: (onChunk) => microphone.start(onChunk),
    stop: async () => {
      await microphone.stop();
    },
  };
}

/**
 * Fallback: records through Web Audio inside the pill window. Its chunks arrive over IPC, and the
 * owner must forward them with `receive()` and `stopped()`.
 */
export class PillMic implements MicSource {
  private readonly pill: PillWindow;
  private onChunk: ((samples: Int16Array) => void) | null = null;
  private starting: { resolve: () => void; reject: (error: Error) => void } | null = null;
  private resolveStopped: (() => void) | null = null;

  constructor(pill: PillWindow) {
    this.pill = pill;
  }

  /** Resolves with the first chunk, or rejects if the pill reports a mic error. */
  start(onChunk: (samples: Int16Array) => void): Promise<void> {
    this.onChunk = onChunk;
    return new Promise((resolve, reject) => {
      this.starting = { resolve, reject };
      this.pill.mic("start");
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        this.resolveStopped = null;
        this.onChunk = null;
        resolve();
      };
      const timer = setTimeout(done, PILL_FLUSH_TIMEOUT_MS);
      this.resolveStopped = done;
      this.pill.mic("stop");
    });
  }

  receive(samples: Int16Array): void {
    this.starting?.resolve();
    this.starting = null;
    this.onChunk?.(samples);
  }

  failed(message: string): void {
    this.starting?.reject(new Error(message));
    this.starting = null;
  }

  stopped(): void {
    this.resolveStopped?.();
  }
}
