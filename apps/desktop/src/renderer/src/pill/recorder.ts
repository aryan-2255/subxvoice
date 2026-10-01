import workletUrl from "./pcm-worklet?worker&url";

// Opening the mic takes ~300 ms in Chromium, which would cut off the first word. So the mic stays
// open ("warm") for a while after each dictation, and the last moments before the key press are kept
// as pre-roll. The OS mic indicator is on while the mic is warm.
const WARM_MS = 60_000;
const PRE_ROLL_CHUNKS = 6; // 6 × 50 ms = 300 ms before the key press

const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
};

type WorkletMessage = { type: "chunk"; samples: Int16Array; level: number } | { type: "flushed" };

/**
 * Fallback recorder (used when the OS plug has no native microphone): streams 16 kHz PCM to the
 * main process between start() and stop().
 */
export class MicRecorder {
  private context: Promise<AudioContext> | null = null;
  private mic: Promise<AudioWorkletNode> | null = null;
  private releaseMic: (() => void) | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private recording = false;
  private preRoll: Int16Array[] = [];

  async start(): Promise<void> {
    clearTimeout(this.closeTimer);
    this.recording = true;
    for (const chunk of this.preRoll) window.subx.pill.sendChunk(chunk);
    this.preRoll = [];
    try {
      await this.openMic();
    } catch (error) {
      this.recording = false;
      window.subx.pill.micError(error instanceof Error ? error.message : "Microphone unavailable");
    }
  }

  stop(): void {
    if (!this.recording || !this.mic) {
      this.recording = false;
      window.subx.pill.micStopped();
      return;
    }
    this.closeTimer = setTimeout(() => this.closeMic(), WARM_MS);
    // The worklet sends its last partial chunk, then "flushed" (handled in onMessage).
    this.mic.then(
      (node) => node.port.postMessage("flush"),
      () => {
        this.recording = false;
        window.subx.pill.micStopped();
      },
    );
  }

  private onMessage(data: WorkletMessage): void {
    if (data.type === "flushed") {
      if (this.recording) {
        this.recording = false;
        window.subx.pill.micStopped();
      }
    } else if (this.recording) {
      window.subx.pill.sendChunk(data.samples);
    } else {
      this.preRoll.push(data.samples);
      if (this.preRoll.length > PRE_ROLL_CHUNKS) this.preRoll.shift();
    }
  }

  private openMic(): Promise<AudioWorkletNode> {
    this.mic ??= (async () => {
      const [stream, context] = await Promise.all([
        navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS),
        this.audioContext(),
      ]);
      await context.resume();
      const node = new AudioWorkletNode(context, "pcm-capture");
      node.port.onmessage = ({ data }: MessageEvent<WorkletMessage>) => this.onMessage(data);
      const source = context.createMediaStreamSource(stream);
      source.connect(node);
      this.releaseMic = () => {
        // Disconnect the source too, or the old node keeps sending chunks.
        source.disconnect();
        node.port.onmessage = null;
        node.disconnect();
        for (const track of stream.getTracks()) track.stop();
      };
      return node;
    })();
    this.mic.catch(() => {
      this.mic = null;
    });
    return this.mic;
  }

  private closeMic(): void {
    if (this.recording) return;
    this.releaseMic?.();
    this.releaseMic = null;
    this.mic = null;
    this.preRoll = [];
  }

  private audioContext(): Promise<AudioContext> {
    this.context ??= (async () => {
      const context = new AudioContext();
      await context.audioWorklet.addModule(workletUrl);
      return context;
    })();
    return this.context;
  }
}
