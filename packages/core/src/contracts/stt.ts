import type { AudioClip } from "../types";

export interface SttCapabilities {
  /** Can return text while the user is still speaking. */
  streaming: boolean;
  /** Handles language switches mid-sentence (e.g. Hindi → English → Spanish). */
  codeSwitching: boolean;
  /** Accepts dictionary words as recognition hints. */
  vocabularyHints: boolean;
}

export interface SttOptions {
  /** Words from the user's dictionary. */
  vocabulary: string[];
  /** Leave empty to auto-detect — we never force one language. */
  languageHint?: string;
}

export interface Transcript {
  text: string;
  /** Detected languages in order of appearance, e.g. ["hi", "en"]. */
  languages: string[];
  confidence?: number;
}

/** Speech → text. One implementation per vendor (or our own model). */
export interface SttProvider {
  readonly id: string;
  readonly capabilities: SttCapabilities;
  transcribe(audio: AudioClip, options: SttOptions): Promise<Transcript>;
  /** Only present when `capabilities.streaming` is true. */
  startStream?(options: SttOptions): Promise<SttStream>;
}

export interface SttStream {
  push(samples: Int16Array): void;
  /** Text recognised so far; may still change. */
  partial(): string;
  finish(): Promise<Transcript>;
}
