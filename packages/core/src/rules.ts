import type { DictionaryEntry } from "./types";

// Unicode-aware "word character", so matching works for Devanagari as well as Latin.
const WORD_CHAR = "[\\p{L}\\p{M}\\p{N}_]";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toPattern = (phrase: string) => phrase.trim().split(/\s+/).map(escapeRegExp).join("\\s+");

/** Replaces every misheard spelling with the word the user wants (whole words, any case). */
export function applyDictionary(text: string, entries: DictionaryEntry[]): string {
  let result = text;
  for (const entry of entries) {
    const variants = entry.misheardAs
      .filter((variant) => variant.trim())
      .sort((a, b) => b.length - a.length)
      .map(toPattern);
    if (variants.length === 0) continue;
    const regex = new RegExp(`(?<!${WORD_CHAR})(?:${variants.join("|")})(?!${WORD_CHAR})`, "giu");
    result = result.replace(regex, () => entry.word);
  }
  return result;
}

/** Collapses stray spaces that STT output often contains. */
export function normalizeSpacing(text: string): string {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/ +([,.!?।])/g, "$1")
    .trim();
}

/** The fast, deterministic cleanup that runs on every dictation — no AI involved. */
export function applyRules(text: string, dictionary: DictionaryEntry[]): string {
  return normalizeSpacing(applyDictionary(text, dictionary));
}
