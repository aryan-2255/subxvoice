// Runs on the audio thread. Loaded with audioWorklet.addModule(), so it must not import anything.

declare const sampleRate: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(name: string, processor: unknown): void;

const TARGET_RATE = 16000;
const CHUNK_SAMPLES = 800; // 50 ms at 16 kHz

/**
 * Downsamples the mic (usually 48 kHz) to 16 kHz mono Int16 by averaging, and posts it in 50 ms
 * chunks together with a loudness level for the waveform. On any message it flushes what is left
 * and replies "flushed".
 */
class PcmCapture extends AudioWorkletProcessor {
  private readonly ratio = sampleRate / TARGET_RATE;
  private position = 0;
  private sum = 0;
  private count = 0;
  private out = new Int16Array(CHUNK_SAMPLES);
  private outLength = 0;
  private sumSquares = 0;

  constructor() {
    super();
    this.port.onmessage = () => {
      this.flush();
      this.port.postMessage({ type: "flushed" });
    };
  }

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0];
    if (channel) for (const sample of channel) this.push(sample);
    return true;
  }

  private push(sample: number): void {
    this.sum += sample;
    this.count++;
    this.position++;
    if (this.position < this.ratio) return;

    this.position -= this.ratio;
    const value = Math.max(-1, Math.min(1, this.sum / this.count));
    this.sum = 0;
    this.count = 0;
    this.sumSquares += value * value;
    this.out[this.outLength++] = value * 0x7fff;
    if (this.outLength === CHUNK_SAMPLES) this.flush();
  }

  private flush(): void {
    if (this.outLength === 0) return;
    const samples = this.out.slice(0, this.outLength);
    const level = Math.sqrt(this.sumSquares / this.outLength);
    this.port.postMessage({ type: "chunk", samples, level }, [samples.buffer]);
    this.outLength = 0;
    this.sumSquares = 0;
  }
}

registerProcessor("pcm-capture", PcmCapture);
