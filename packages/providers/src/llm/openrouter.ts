import type { LlmProvider, LlmRequest, LlmResponse } from "@subx/core";
import { SubxError } from "@subx/core";

const DEFAULT_URL = "https://openrouter.ai/api/v1/chat/completions";
/**
 * Benchmarked against gpt-oss-20b, llama-4-scout, llama-3.3-70b and qwen3-32b on Hindi-English
 * samples: this was both the fastest (~280 ms warm on Groq) and the only one that never left
 * Devanagari untouched. Groq rejects gpt-oss with reasoning disabled, so "low" is the floor.
 */
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const DEFAULT_MAX_TOKENS = 1200;
const TIMEOUT_MS = 20000;

export interface OpenRouterOptions {
  /** Short-lived token from our backend, or a dev key from the environment. */
  token: string;
  model?: string;
  baseUrl?: string;
  /** Restrict routing to only these upstream providers. */
  only?: string[];
  /**
   * Preferred upstream providers, tried in order, with fallback to the rest. Benchmarked on
   * Hindi-English: cerebras is fastest and most consistent (~450 ms), groq a close second — so
   * cerebras first, groq as backup.
   */
  order?: string[];
}

interface ChatResponse {
  choices?: { message?: { content?: string | null } }[];
  error?: { message?: string };
}

export class OpenRouterLlm implements LlmProvider {
  readonly id = "openrouter";

  private readonly options: OpenRouterOptions;

  constructor(options: OpenRouterOptions) {
    if (!options.token) throw new SubxError("provider", "OpenRouter needs a token");
    this.options = options;
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const response = await fetch(this.options.baseUrl ?? DEFAULT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.token}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model: this.options.model ?? DEFAULT_MODEL,
        messages: [
          { role: "system", content: request.system },
          ...request.messages.map((message) => ({ role: message.role, content: message.content })),
        ],
        temperature: 0,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        reasoning: { effort: "low" },
        ...(this.options.order
          ? { provider: { order: this.options.order } }
          : this.options.only
            ? { provider: { only: this.options.only } }
            : {}),
      }),
    });

    const body = (await response.json().catch(() => ({}))) as ChatResponse;
    if (!response.ok) {
      // OpenRouter puts the real reason in the body, not the status line.
      const detail = body.error?.message ?? `HTTP ${response.status}`;
      const hint =
        response.status === 401 || response.status === 402 || response.status === 403
          ? " — check OPENROUTER_API_KEY"
          : "";
      throw new SubxError("provider", `OpenRouter: ${detail}${hint}`);
    }

    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) throw new SubxError("provider", "OpenRouter returned an empty response");
    // Tool calling is wired when the command router needs it; dictation never asks for tools.
    return { text, toolCalls: [] };
  }
}
