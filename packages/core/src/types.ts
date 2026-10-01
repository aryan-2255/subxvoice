/** 16 kHz mono PCM — the one audio format every STT plug receives. */
export interface AudioClip {
  samples: Int16Array;
  sampleRate: number;
}

/** Chosen by the hotkey: keep the user's exact words, or rewrite them in their style. */
export type Mode = "exact" | "style";

/** What the user is looking at while speaking. Every field is optional — OS support varies. */
export interface AppContext {
  appName?: string;
  appId?: string;
  windowTitle?: string;
  url?: string;
  selectedText?: string;
}

/** A word the user cares about, plus the spellings STT tends to produce instead. */
export interface DictionaryEntry {
  word: string;
  misheardAs: string[];
}

/** Milliseconds spent in each pipeline stage. */
export interface Timings {
  sttMs: number;
  rulesMs: number;
  llmMs: number;
  insertMs: number;
  totalMs: number;
}

/** One dictation, as stored in local history. */
export interface SessionRecord {
  id: string;
  createdAt: number;
  mode: Mode;
  context: AppContext;
  rawText: string;
  finalText: string;
  audioPath?: string;
  /** Length of the recording. */
  audioMs?: number;
  timings: Timings;
}
