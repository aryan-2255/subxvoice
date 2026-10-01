// Fake plugs: run the pipeline and tests without a microphone, an OS or an API key.
import type { LlmProvider, LlmRequest, LlmResponse } from "./contracts/llm";
import type { Platform, TextInserter } from "./contracts/platform";
import type { DictionaryStore, HistoryStore } from "./contracts/store";
import type { SttProvider, Transcript } from "./contracts/stt";
import type { DictionaryEntry, SessionRecord } from "./types";

export class FakeStt implements SttProvider {
  readonly id = "fake";
  readonly capabilities = { streaming: false, codeSwitching: true, vocabularyHints: true };
  private readonly text: string;

  constructor(text: string) {
    this.text = text;
  }

  async transcribe(): Promise<Transcript> {
    return { text: this.text, languages: [] };
  }
}

export class FakeLlm implements LlmProvider {
  readonly id = "fake";
  readonly requests: LlmRequest[] = [];
  private readonly reply: string;

  constructor(reply: string) {
    this.reply = reply;
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    this.requests.push(request);
    return { text: this.reply, toolCalls: [] };
  }
}

export class FakeInserter implements TextInserter {
  readonly inserted: string[] = [];

  async insert(text: string): Promise<void> {
    this.inserted.push(text);
  }
}

export class MemoryHistory implements HistoryStore {
  readonly records: SessionRecord[] = [];

  async save(record: SessionRecord): Promise<void> {
    this.records.unshift(record);
  }

  async recent(limit: number): Promise<SessionRecord[]> {
    return this.records.slice(0, limit);
  }

  async remove(id: string): Promise<void> {
    const index = this.records.findIndex((record) => record.id === id);
    if (index >= 0) this.records.splice(index, 1);
  }
}

export class MemoryDictionary implements DictionaryStore {
  private readonly entries: DictionaryEntry[];

  constructor(entries: DictionaryEntry[] = []) {
    this.entries = entries;
  }

  async all(): Promise<DictionaryEntry[]> {
    return this.entries;
  }

  async upsert(entry: DictionaryEntry): Promise<void> {
    const index = this.entries.findIndex((existing) => existing.word === entry.word);
    if (index >= 0) this.entries[index] = entry;
    else this.entries.push(entry);
  }

  async remove(word: string): Promise<void> {
    const index = this.entries.findIndex((entry) => entry.word === word);
    if (index >= 0) this.entries.splice(index, 1);
  }
}

export function fakePlatform(): Platform & { inserter: FakeInserter } {
  return {
    os: "fake",
    hotkey: {
      defaultBindings: () => [{ keys: "right_option", mode: "exact" }],
      register: async () => {},
      unregisterAll: async () => {},
    },
    inserter: new FakeInserter(),
    permissions: {
      required: () => ["microphone"],
      status: async () => "granted",
      request: async () => {},
      openSettings: async () => {},
    },
    context: { current: async () => ({ appName: "Fake App" }) },
    desktop: { openApp: async () => {}, openUrl: async () => {} },
  };
}
