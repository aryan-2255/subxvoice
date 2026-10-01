// Local JSON-file stores. They implement the core store interfaces, so they can be swapped for
// SQLite later without touching anything else.
import { readFile, rename, writeFile } from "node:fs/promises";
import type { DictionaryEntry, DictionaryStore, HistoryStore, SessionRecord } from "@subx/core";

class JsonFile<T> {
  private readonly path: string;
  private readonly fallback: T;
  private pending: Promise<void> = Promise.resolve();

  constructor(path: string, fallback: T) {
    this.path = path;
    this.fallback = fallback;
  }

  async read(): Promise<T> {
    try {
      return JSON.parse(await readFile(this.path, "utf8")) as T;
    } catch {
      return this.fallback;
    }
  }

  /** Writes are queued and atomic (temp file + rename), so a crash never leaves half a file. */
  write(value: T): Promise<void> {
    this.pending = this.pending.then(async () => {
      const temp = `${this.path}.tmp`;
      await writeFile(temp, JSON.stringify(value));
      await rename(temp, this.path);
    });
    return this.pending;
  }
}

export class JsonHistoryStore implements HistoryStore {
  private readonly file: JsonFile<SessionRecord[]>;
  private records: SessionRecord[] | null = null;

  constructor(path: string) {
    this.file = new JsonFile(path, []);
  }

  async save(record: SessionRecord): Promise<void> {
    const records = await this.load();
    records.unshift(record);
    await this.file.write(records);
  }

  async recent(limit: number): Promise<SessionRecord[]> {
    return (await this.load()).slice(0, limit);
  }

  async find(id: string): Promise<SessionRecord | undefined> {
    return (await this.load()).find((record) => record.id === id);
  }

  async remove(id: string): Promise<void> {
    const records = await this.load();
    this.records = records.filter((record) => record.id !== id);
    await this.file.write(this.records);
  }

  /** The pipeline writes the record; the app saves the audio afterwards, off the critical path. */
  async attachAudio(id: string, audioPath: string, audioMs: number): Promise<void> {
    const records = await this.load();
    const record = records.find((item) => item.id === id);
    if (!record) return;
    record.audioPath = audioPath;
    record.audioMs = audioMs;
    await this.file.write(records);
  }

  private async load(): Promise<SessionRecord[]> {
    this.records ??= await this.file.read();
    return this.records;
  }
}

export class JsonDictionaryStore implements DictionaryStore {
  private readonly file: JsonFile<DictionaryEntry[]>;
  private entries: DictionaryEntry[] | null = null;

  constructor(path: string) {
    this.file = new JsonFile(path, []);
  }

  async all(): Promise<DictionaryEntry[]> {
    return this.load();
  }

  async upsert(entry: DictionaryEntry): Promise<void> {
    const entries = await this.load();
    const index = entries.findIndex((existing) => existing.word === entry.word);
    if (index >= 0) entries[index] = entry;
    else entries.push(entry);
    await this.file.write(entries);
  }

  async remove(word: string): Promise<void> {
    const entries = await this.load();
    this.entries = entries.filter((entry) => entry.word !== word);
    await this.file.write(this.entries);
  }

  private async load(): Promise<DictionaryEntry[]> {
    this.entries ??= await this.file.read();
    return this.entries;
  }
}

export class JsonSettingsStore<T extends object> {
  private readonly file: JsonFile<Partial<T>>;
  private readonly defaults: T;
  private current: T | null = null;

  constructor(path: string, defaults: T) {
    this.file = new JsonFile(path, {});
    this.defaults = defaults;
  }

  async all(): Promise<T> {
    // Unknown keys from an older build are dropped; missing ones fall back to the default.
    this.current ??= { ...this.defaults, ...(await this.file.read()) };
    return this.current;
  }

  async update(patch: Partial<T>): Promise<T> {
    const next = { ...(await this.all()), ...patch };
    this.current = next;
    await this.file.write(next);
    return next;
  }
}
