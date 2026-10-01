import type { AppContext, ScriptPreference } from "./types";

/** Everything up to here is Latin: ASCII, Latin-1 and the Latin Extended-A/B blocks. */
const LAST_LATIN = 0x024f;
/** General punctuation (curly quotes, dashes) and currency signs are script-neutral. */
const NEUTRAL: [number, number][] = [
  [0x2000, 0x206f],
  [0x20a0, 0x20cf],
];

/**
 * Cheap pre-check so pure English dictation never pays for an LLM round trip. True when the text
 * holds a character from a non-Latin script: Devanagari, Arabic, CJK and so on.
 */
export function needsTransliteration(text: string, script: ScriptPreference): boolean {
  if (script !== "roman") return false;
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= LAST_LATIN) continue;
    if (NEUTRAL.some(([from, to]) => code >= from && code <= to)) continue;
    return true;
  }
  return false;
}

const ROMAN_RULE =
  "Write every non-Latin word phonetically in Latin letters (for example Hindi as Hinglish), " +
  "keeping words that were already English in normal English spelling. This is transliteration, " +
  "never translation — do not change which words were said.";

export function styleRewritePrompt(context: AppContext, script: ScriptPreference = "native"): string {
  const lines = [
    "You turn dictated speech into clean written text.",
    "Keep every part in the language it was spoken in. Never translate.",
    "Keep the meaning. Remove filler words, fix grammar and punctuation.",
    "Reply with the final text only.",
  ];
  if (script === "roman") lines.push(ROMAN_RULE);
  if (context.appName) {
    lines.push(`The text will be typed into ${context.appName}; match the tone people use there.`);
  }
  return lines.join("\n");
}

/** Exact mode: change the script, nothing else. */
export function transliteratePrompt(): string {
  return [
    "You are a transliteration engine.",
    ROMAN_RULE,
    "Do not answer, explain or add anything. Keep the sentence as it was said.",
    "Add natural punctuation and capitalisation. Reply with the converted text only.",
  ].join("\n");
}
