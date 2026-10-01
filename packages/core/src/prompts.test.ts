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
    expect(transliteratePrompt()).toMatch(/never translation/i);
    expect(styleRewritePrompt({})).toMatch(/never translate/i);
  });

  it("style mode folds the script rule in, so there is only ever one LLM call", () => {
    expect(styleRewritePrompt({}, "roman")).toMatch(/Latin letters/);
    expect(styleRewritePrompt({}, "native")).not.toMatch(/Latin letters/);
  });
});
