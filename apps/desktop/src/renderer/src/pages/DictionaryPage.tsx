import type { DictionaryEntry } from "@subx/core";
import { type FormEvent, useEffect, useState } from "react";
import { PageHeader } from "../shared/PageHeader";

const INPUT =
  "w-full rounded-md border border-line bg-canvas px-3 py-2 outline-none placeholder:text-muted focus:border-accent";

export function DictionaryPage() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [word, setWord] = useState("");
  const [heardAs, setHeardAs] = useState("");

  const load = () => void window.subx.dictionary.list().then(setEntries);
  useEffect(load, []);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!word.trim()) return;
    const misheardAs = heardAs
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    await window.subx.dictionary.upsert({ word: word.trim(), misheardAs });
    setWord("");
    setHeardAs("");
    load();
  }

  async function remove(entryWord: string) {
    await window.subx.dictionary.remove(entryWord);
    load();
  }

  return (
    <>
      <PageHeader title="Dictionary">
        Names, products and terms SUBXVoice should always spell your way. Add what it tends to mishear, and it
        will correct it. Corrections apply once speech-to-text is connected.
      </PageHeader>

      <form onSubmit={add} className="mb-10 grid grid-cols-[1fr_1.4fr_auto] items-end gap-3">
        <label className="space-y-1.5">
          <span className="font-medium">Word</span>
          <input
            className={INPUT}
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="SUBXVoice"
          />
        </label>
        <label className="space-y-1.5">
          <span className="font-medium">Often heard as</span>
          <input
            className={INPUT}
            value={heardAs}
            onChange={(e) => setHeardAs(e.target.value)}
            placeholder="sub x voice, subex voice"
          />
        </label>
        <button
          type="submit"
          disabled={!word.trim()}
          className="rounded-md bg-accent px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          Add word
        </button>
      </form>

      {entries.length === 0 ? (
        <p className="text-muted">No words yet. Start with names you say often.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {entries.map((entry) => (
            <li key={entry.word} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="font-medium select-text">{entry.word}</p>
                {entry.misheardAs.length > 0 && (
                  <p className="truncate text-muted">Fixes {entry.misheardAs.join(", ")}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(entry.word)}
                className="text-muted hover:text-danger"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
