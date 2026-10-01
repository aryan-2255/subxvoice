import { type AudioClip, type Microphone, SubxError } from "@subx/core";
import type { HelperMessage, MacHelper } from "./helper";

const SAMPLE_RATE = 16000;

/**
 * Native microphone through the Swift helper (AVAudioEngine). Starts in ~100 ms and is fully off
 * between recordings, so the macOS mic indicator only shows while the user is dictating.
 */
export class MacMicrophone implements Microphone {
  private readonly helper: MacHelper;
  private chunks: Int16Array[] = [];
  private unsubscribe: (() => void) | null = null;

  constructor(helper: MacHelper) {
    this.helper = helper;
  }

  async start(onChunk: (samples: Int16Array) => void): Promise<void> {
    this.chunks = [];
    this.unsubscribe?.();
    this.unsubscribe = this.helper.on((message) => {
      if (message.type !== "audio") return;
      const samples = decode(message.data);
      this.chunks.push(samples);
      onChunk(samples);
    });

    const reply = await this.helper.request(
      { cmd: "mic_start" },
      (message): message is Extract<HelperMessage, { type: "mic_started" | "error" }> =>
        message.type === "mic_started" || (message.type === "error" && message.code.startsWith("mic_")),
    );
    if (reply.type === "error") {
      this.unsubscribe();
      this.unsubscribe = null;
      throw new SubxError(reply.code === "mic_denied" ? "permission_denied" : "provider", reply.message);
    }
  }

  async stop(): Promise<AudioClip> {
    await this.helper.request(
      { cmd: "mic_stop" },
      (message): message is Extract<HelperMessage, { type: "mic_stopped" }> => message.type === "mic_stopped",
    );
    this.unsubscribe?.();
    this.unsubscribe = null;
    const samples = new Int16Array(this.chunks.reduce((total, chunk) => total + chunk.length, 0));
    let offset = 0;
    for (const chunk of this.chunks) {
      samples.set(chunk, offset);
      offset += chunk.length;
    }
    this.chunks = [];
    return { samples, sampleRate: SAMPLE_RATE };
  }
}

/** Base64 little-endian Int16 → Int16Array (copied, because Buffer offsets may be unaligned). */
function decode(base64: string): Int16Array {
  const bytes = Buffer.from(base64, "base64");
  return new Int16Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}
