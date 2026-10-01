import { type LlmProvider, type SttProvider, SubxError } from "@subx/core";
import { FakeLlm, FakeStt } from "@subx/core/fakes";
import { OpenRouterLlm } from "./llm/openrouter";
import { SonioxStt } from "./stt/soniox";

export interface ProviderConfig {
  /** e.g. "soniox", "openrouter", "fake". */
  id: string;
  model?: string;
  /** Short-lived token from our backend — never a raw vendor API key. */
  token?: string;
  baseUrl?: string;
  /** Pin the upstream provider where the vendor routes to several (OpenRouter). */
  only?: string[];
  /** Preferred upstream providers in order, with fallback (OpenRouter). */
  order?: string[];
  /** Languages to bias STT toward (hints, not a restriction). Defaults to Hindi + English. */
  languageHints?: string[];
}

// To add a vendor: create stt/<vendor>.ts (or llm/<vendor>.ts) implementing the
// interface from @subx/core, then add one `case` below.

export function createStt(config: ProviderConfig): SttProvider {
  switch (config.id) {
    case "soniox":
      return new SonioxStt({
        token: requireToken(config, "Soniox"),
        model: config.model,
        baseUrl: config.baseUrl,
        languageHints: config.languageHints,
      });
    case "fake":
      return new FakeStt("hello from the fake speech-to-text provider");
    default:
      throw new SubxError("unsupported", `Unknown STT provider: ${config.id}`);
  }
}

export function createLlm(config: ProviderConfig): LlmProvider {
  switch (config.id) {
    case "openrouter":
      return new OpenRouterLlm({
        token: requireToken(config, "OpenRouter"),
        model: config.model,
        baseUrl: config.baseUrl,
        only: config.only,
        order: config.order,
      });
    case "fake":
      return new FakeLlm("Hello from the fake LLM provider.");
    default:
      throw new SubxError("unsupported", `Unknown LLM provider: ${config.id}`);
  }
}

function requireToken(config: ProviderConfig, name: string): string {
  if (!config.token) throw new SubxError("provider", `${name} needs a token`);
  return config.token;
}

export { OpenRouterLlm, type OpenRouterOptions } from "./llm/openrouter";
export { type SonioxOptions, SonioxStt } from "./stt/soniox";
