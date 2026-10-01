// Live tests against the real vendors. Skipped automatically when the keys are absent, so CI
// stays green without secrets. Run them locally with a .env at the repo root:
//
//   pnpm --filter @subx/providers test
//
// Set SUBX_TEST_AUDIO to a 16 kHz mono WAV to also check a real utterance end to end.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createLlm, createStt } from "./index";

const sonioxKey = process.env.SONIOX_API_KEY?.trim();
const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
const audioPath = process.env.SUBX_TEST_AUDIO?.trim();

const SAMPLE_RATE = 16000;

/** Minimal 16-bit PCM WAV reader — enough for a fixture we control. */
function readWav(path: string): Int16Array {
  const buffer = readFileSync(path);
  let offset = 12; // skip "RIFF....WAVE"
  while (offset < buffer.length - 8) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "data") {
      const bytes = buffer.subarray(offset + 8, offset + 8 + size);
      return new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.length / 2));
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error(`No data chunk in ${path}`);
}

describe.skipIf(!sonioxKey)("Soniox (live)", () => {
  it("connects, authenticates and finishes cleanly", async () => {
    const stt = createStt({ id: "soniox", token: sonioxKey });
    // Half a second of silence: no words expected, but the whole protocol is exercised.
    const transcript = await stt.transcribe(
      { samples: new Int16Array(SAMPLE_RATE / 2), sampleRate: SAMPLE_RATE },
      { vocabulary: [] },
    );
    expect(typeof transcript.text).toBe("string");
  }, 30000);

  it("rejects a bad key instead of hanging", async () => {
    const stt = createStt({ id: "soniox", token: "snx_not_a_real_key" });
    await expect(
      stt.transcribe({ samples: new Int16Array(1600), sampleRate: SAMPLE_RATE }, { vocabulary: [] }),
    ).rejects.toThrow();
  }, 30000);

  it.skipIf(!audioPath)(
    "transcribes real speech",
    async () => {
      const stt = createStt({ id: "soniox", token: sonioxKey });
      const transcript = await stt.transcribe(
        { samples: readWav(audioPath as string), sampleRate: SAMPLE_RATE },
        { vocabulary: [] },
      );
      console.log("heard:", transcript.text);
      expect(transcript.text.length).toBeGreaterThan(5);
    },
    60000,
  );
});

describe.skipIf(!openRouterKey)("OpenRouter (live)", () => {
  it("transliterates Devanagari without translating it", async () => {
    const llm = createLlm({ id: "openrouter", token: openRouterKey, only: ["groq"] });
    const { transliteratePrompt } = await import("@subx/core");

    const started = Date.now();
    const response = await llm.complete({
      system: transliteratePrompt(),
      messages: [{ role: "user", content: "मुझे कल सुबह नौ बजे meeting attend करनी है" }],
    });
    console.log(`llm: ${Date.now() - started} ms ->`, response.text);

    // Roman letters out...
    expect(response.text).not.toMatch(/[ऀ-ॿ]/);
    // ...and still the same words, not an English translation.
    expect(response.text.toLowerCase()).toContain("kal");
    expect(response.text.toLowerCase()).toContain("meeting");
  }, 30000);

  it("reports a bad key clearly", async () => {
    const llm = createLlm({ id: "openrouter", token: "sk-or-v1-not-a-real-key" });
    await expect(llm.complete({ system: "hi", messages: [{ role: "user", content: "hi" }] })).rejects.toThrow(
      /OPENROUTER_API_KEY/,
    );
  }, 30000);
});
