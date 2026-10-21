import { describe, expect, it } from "vitest";
import { needsTransliteration, styleRewritePrompt, transliteratePrompt } from "./prompts";

describe("needsTransliteration", () => {
  it("is off unless the user asked for Roman letters", () => {
    expect(needsTransliteration("मुझे कल जाना है", "native")).toBe(false);
  });

  it("spots a non-Latin script", () => {
    expect(needsTransliteration("मुझे kal jaana hai", "roman")).toBe(true);
  });

  // Pure English must never pay for an LLM round trip.
  it("skips text that is already Latin, accents and punctuation included", () => {
    expect(needsTransliteration("Please add the meeting — café, 9am!", "roman")).toBe(false);
  });
});

describe("prompts", () => {
  it("both prompts forbid translation", () => {
    expect(transliteratePrompt()).toMatch(/never translate/i);
    expect(styleRewritePrompt({})).toMatch(/never translate/i);
  });

  // Speech recognition writes English loanwords in Devanagari ("प्लीज़"), and spelling those
  // phonetically turns plain English into gibberish ("Pleez note dait"). The prompt has to say
  // so, with examples, or the model does it blindly.
  it("tells the model to spell English words in English, even from Devanagari", () => {
    const prompt = transliteratePrompt();
    expect(prompt).toMatch(/standard English/i);
    expect(prompt).toContain("प्लीज़");
    expect(prompt).toMatch(/never spell an English word phonetically/i);
  });

  it("tells the model Hindi words become Hinglish", () => {
    expect(transliteratePrompt()).toMatch(/phonetically in Latin letters/i);
    expect(transliteratePrompt()).toContain("teri");
  });

  // Dictation is one pass, so an obvious mishearing has to be read through, not preserved.
  it("asks for misheard words to be repaired, without inventing content", () => {
    const prompt = transliteratePrompt();
    expect(prompt).toMatch(/misheard/i);
    expect(prompt).toMatch(/do not add ideas/i);
  });

  it("tells the model the text is dictation, not a question to answer", () => {
    expect(transliteratePrompt()).toMatch(/not a question to you/i);
  });

  it("style mode folds the script rule in, so there is only ever one LLM call", () => {
    expect(styleRewritePrompt({}, "roman")).toMatch(/Latin letters/);
    expect(styleRewritePrompt({}, "native")).not.toMatch(/Latin letters/);
  });
});
