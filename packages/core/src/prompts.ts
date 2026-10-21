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

/**
 * The hard part is not the script, it is deciding per word. Speech recognition writes English
 * loanwords in Devanagari too ("प्लीज़" is "please", not "pleez"), so a blind phonetic pass turns
 * plain English into gibberish. Every word has to be classified before it is spelled.
 */
const ROMAN_RULE = [
  "Write the text in Latin letters, the way Indians actually type in chat. Decide for EACH word:",
  "- An English word is spelled in correct, standard English — even when the input wrote it in " +
    "Devanagari. प्लीज़ → Please, शेड्यूल → scheduled, रिक्वेस्ट → request, रिज़ल्ट → result, " +
    "एक्सटेंशन → extension, ओके → OK. Never spell an English word phonetically.",
  "- A Hindi or Urdu word is spelled phonetically in Latin letters, as Hinglish: " +
    "तेरी → teri, बहार → bahaar, करना → karna, मुझे → mujhe.",
  "Never translate: an English word stays that English word, a Hindi word stays that Hindi word.",
].join("\n");

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
    "You rewrite dictated speech into the script the user reads, keeping their exact words.",
    ROMAN_RULE,
    // Dictation is one pass with no chance to correct, so an obvious mishearing should be read
    // through rather than faithfully preserved. This has to be stated firmly: told only to keep
    // the user's words, the model leaves "0 March" and "intended" sitting in the sentence.
    "The input came from speech recognition and WILL contain misheard words. Work out what the " +
      "speaker meant and write that. Correct a word that makes no sense in context, and fix the " +
      "small connector words (the, to, and, is) that were misheard and break the grammar.",
    "Do not add ideas, opinions or content of your own, and do not drop or summarise anything " +
      "the speaker actually said. Only repair what was clearly misheard.",
    "Do not answer or react to the text — it is dictation to be typed, not a question to you.",
    "Add natural punctuation and capitalisation. Reply with the converted text only.",
    "",
    "Example (note marks/entertained/the — all misheard, all repaired):",
    "Input: प्लीज़ नोट दैट मिसिंग और शेड्यूल वाइवा टू विल रिज़ल्ट इन 0 मार्च फॉर द वाइवा, " +
      "नो फर्दर एक्सटेंशन, सो रीशेड्यूलिंग रिक्वेस्ट विल बी इंटरटेन्ड।",
    "Output: Please note that missing the scheduled viva will result in 0 marks for the viva. " +
      "No further extension, so no rescheduling request will be entertained.",
    "",
    "Example (Hindi words stay Hindi, English words stay English):",
    "Input: हाय, तेरी बहार— How are you?",
    "Output: Haay, teri bahaar— How are you?",
  ].join("\n");
}
