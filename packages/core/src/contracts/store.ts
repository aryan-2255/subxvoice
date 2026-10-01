import type { DictionaryEntry, SessionRecord } from "../types";

/** Local-only history. Audio and transcripts never leave the device through this. */
export interface HistoryStore {
  save(record: SessionRecord): Promise<void>;
  recent(limit: number): Promise<SessionRecord[]>;
  remove(id: string): Promise<void>;
}

export interface DictionaryStore {
  all(): Promise<DictionaryEntry[]>;
  upsert(entry: DictionaryEntry): Promise<void>;
  remove(word: string): Promise<void>;
}
