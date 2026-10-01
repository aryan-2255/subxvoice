import { describe, expect, it } from "vitest";
import { applyDictionary, applyRules } from "./rules";

describe("applyDictionary", () => {
  it("replaces misheard phrases with the user's word, ignoring case and spacing", () => {
    const entries = [{ word: "SUBXVoice", misheardAs: ["sub x voice", "subx voice"] }];
    expect(applyDictionary("I love Sub X  voice a lot", entries)).toBe("I love SUBXVoice a lot");
  });

  it("only replaces whole words", () => {
    const entries = [{ word: "Deepak", misheardAs: ["dipak"] }];
    expect(applyDictionary("dipak and dipaksingh", entries)).toBe("Deepak and dipaksingh");
  });

  it("works for Devanagari", () => {
    const entries = [{ word: "दीपक", misheardAs: ["दिपक"] }];
    expect(applyDictionary("मेरा नाम दिपक है", entries)).toBe("मेरा नाम दीपक है");
  });

  it("does not treat $ in the replacement as a pattern", () => {
    const entries = [{ word: "$USD", misheardAs: ["dollar usd"] }];
    expect(applyDictionary("pay in dollar usd", entries)).toBe("pay in $USD");
  });
});

describe("applyRules", () => {
  it("cleans spacing before punctuation", () => {
    expect(applyRules("  hello   world , how are you ? ", [])).toBe("hello world, how are you?");
  });
});
