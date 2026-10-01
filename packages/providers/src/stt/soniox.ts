import {
  type AudioClip,
  type SttOptions,
  type SttProvider,
  type SttStream,
  SubxError,
  type Transcript,
} from "@subx/core";

const DEFAULT_URL = "wss://stt-rt.soniox.com/transcribe-websocket";
const DEFAULT_MODEL = "stt-rt-v5";
const OPEN_TIMEOUT_MS = 8000;
const FINALISE_TIMEOUT_MS = 5000;

/** Soniox sends these as ordinary tokens; they are control signals, not speech. */
const MARKERS = new Set(["<fin>", "<end>"]);

export interface SonioxOptions {
  /** Short-lived token from our backend, or a dev key from the environment. */
  token: string;
  model?: string;
  baseUrl?: string;
  /**
   * Languages to bias recognition toward. These are hints, not a restriction, so other languages
   * still transcribe and mid-sentence switching still works — they just measurably sharpen the
   * ones you actually speak. Defaults to Hindi + English, the common code-mixed case.
   */
  languageHints?: string[];
}

const DEFAULT_LANGUAGE_HINTS = ["hi", "en"];

interface SonioxToken {
  text: string;
  is_final?: boolean;
  language?: string;
}

interface SonioxMessage {
  tokens?: SonioxToken[];
  finished?: boolean;
  error_code?: string | null;
  error_message?: string;
}

/**
 * Soniox real-time speech-to-text. Streams while the user talks, so when the hotkey comes up only
 * the last few hundred milliseconds are still outstanding.
 */
export class SonioxStt implements SttProvider {
  readonly id = "soniox";
  readonly capabilities = { streaming: true, codeSwitching: true, vocabularyHints: true };

  private readonly options: SonioxOptions;

  constructor(options: SonioxOptions) {
    if (!options.token) throw new SubxError("provider", "Soniox needs a token");
    this.options = options;
  }

  /** Batch path, built on the streaming one so there is only one implementation to trust. */
  async transcribe(audio: AudioClip, options: SttOptions): Promise<Transcript> {
    const stream = await this.startStream(options, audio.sampleRate);
    stream.push(audio.samples);
    return stream.finish();
  }

  async startStream(options: SttOptions, sampleRate = 16000): Promise<SttStream> {
    const stream = new SonioxStream(this.options, options, sampleRate);
    await stream.ready();
    return stream;
  }
}

class SonioxStream implements SttStream {
  private readonly socket: WebSocket;
  /** Audio recorded before the socket finished opening — flushed, never dropped. */
  private backlog: Int16Array[] = [];
  private opened = false;
  private finalParts: string[] = [];
  private pendingParts: string[] = [];
  private readonly languages = new Set<string>();
  private failure: Error | null = null;
  private settleOpen: (() => void) | null = null;
  private failOpen: ((error: Error) => void) | null = null;
  private settleFinish: (() => void) | null = null;
  private readonly openPromise: Promise<void>;
  private readonly finishPromise: Promise<void>;

  constructor(connection: SonioxOptions, options: SttOptions, sampleRate: number) {
    this.openPromise = new Promise((resolve, reject) => {
      this.settleOpen = resolve;
      this.failOpen = reject;
    });
    this.finishPromise = new Promise((resolve) => {
      this.settleFinish = resolve;
    });

    this.socket = new WebSocket(connection.baseUrl ?? DEFAULT_URL);
    this.socket.binaryType = "arraybuffer";

    this.socket.onopen = () => {
      this.socket.send(
        JSON.stringify({
          api_key: connection.token,
          model: connection.model ?? DEFAULT_MODEL,
          audio_format: "pcm_s16le",
          sample_rate: sampleRate,
          num_channels: 1,
          // The hotkey is our endpoint, so Soniox must not decide when we stopped talking.
          enable_endpoint_detection: false,
          // A per-dictation hint wins; otherwise the provider's configured languages.
          language_hints: options.languageHint
            ? [options.languageHint]
            : (connection.languageHints ?? DEFAULT_LANGUAGE_HINTS),
          ...(options.vocabulary.length > 0 ? { context: { terms: options.vocabulary } } : {}),
        }),
      );
      this.opened = true;
      for (const chunk of this.backlog) this.sendAudio(chunk);
      this.backlog = [];
      this.settleOpen?.();
      this.settleOpen = null;
    };

    this.socket.onmessage = (event) => this.receive(event.data);
    this.socket.onerror = () => this.fail(new SubxError("provider", "Soniox connection failed"));
    this.socket.onclose = (event) => {
      if (event.wasClean || this.failure) {
        // A close before <fin> still releases finish(); whatever was heard is kept.
        this.settleFinish?.();
        this.settleFinish = null;
        return;
      }
      this.fail(new SubxError("provider", `Soniox closed the connection (${event.code})`));
    };

    setTimeout(() => {
      if (!this.opened) this.fail(new SubxError("provider", "Soniox did not accept the connection"));
    }, OPEN_TIMEOUT_MS);
  }

  ready(): Promise<void> {
    return this.openPromise;
  }

  push(samples: Int16Array): void {
    if (this.failure) return;
    if (!this.opened) {
      this.backlog.push(samples);
      return;
    }
    this.sendAudio(samples);
  }

  partial(): string {
    return assemble(this.finalParts, this.pendingParts);
  }

  async finish(): Promise<Transcript> {
    if (this.failure) throw this.failure;
    if (this.socket.readyState === WebSocket.OPEN) {
      // Finalize rather than closing: same result, and the close handshake stays off the
      // user's critical path.
      this.socket.send(JSON.stringify({ type: "finalize" }));
      await Promise.race([this.finishPromise, delay(FINALISE_TIMEOUT_MS)]);
    }
    this.close();
    if (this.failure && !this.partial()) throw this.failure;
    return {
      text: this.partial(),
      languages: [...this.languages],
    };
  }

  private sendAudio(samples: Int16Array): void {
    this.socket.send(new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength));
  }

  private receive(data: unknown): void {
    if (typeof data !== "string") return;
    let message: SonioxMessage;
    try {
      message = JSON.parse(data) as SonioxMessage;
    } catch {
      return;
    }
    if (message.error_code) {
      this.fail(new SubxError("provider", `Soniox: ${message.error_code} ${message.error_message ?? ""}`));
      return;
    }
    let done = message.finished === true;
    this.pendingParts = [];
    for (const token of message.tokens ?? []) {
      if (MARKERS.has(token.text)) {
        done = done || token.text === "<fin>";
        continue;
      }
      if (token.language) this.languages.add(token.language);
      if (token.is_final) this.finalParts.push(token.text);
      else this.pendingParts.push(token.text);
    }
    if (done) {
      this.settleFinish?.();
      this.settleFinish = null;
    }
  }

  private fail(error: Error): void {
    this.failure ??= error;
    this.failOpen?.(error);
    this.failOpen = null;
    this.settleOpen = null;
    this.settleFinish?.();
    this.settleFinish = null;
    this.close();
  }

  private close(): void {
    if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
      this.socket.close();
    }
  }
}

/** Soniox tokens carry their own leading spaces, so plain concatenation is correct. */
function assemble(final: string[], pending: string[]): string {
  return [...final, ...pending].join("").trim();
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
