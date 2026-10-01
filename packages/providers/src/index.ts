import { type LlmProvider, type SttProvider, SubxError } from "@subx/core";
import { FakeLlm, FakeStt } from "@subx/core/fakes";

export interface ProviderConfig {
  /** e.g. "deepgram", "groq-whisper", "local-whisper", "fake". */
  id: string;
  model?: string;
  /** Short-lived token from our backend — never a raw vendor API key. */
  token?: string;
  baseUrl?: string;
}

// To add a vendor: create stt/<vendor>.ts (or llm/<vendor>.ts) implementing the
// interface from @subx/core, then add one `case` below.

export function createStt(config: ProviderConfig): SttProvider {
  switch (config.id) {
    case "fake":
      return new FakeStt("hello from the fake speech-to-text provider");
    default:
      throw new SubxError("unsupported", `Unknown STT provider: ${config.id}`);
  }
}

export function createLlm(config: ProviderConfig): LlmProvider {
  switch (config.id) {
    case "fake":
      return new FakeLlm("Hello from the fake LLM provider.");
    default:
      throw new SubxError("unsupported", `Unknown LLM provider: ${config.id}`);
  }
}
