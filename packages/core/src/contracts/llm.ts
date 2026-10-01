import type { ToolSpec } from "./tool";

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  /** Tools the model may call (built-in, OS or MCP — see ToolRegistry). */
  tools?: ToolSpec[];
  maxTokens?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface LlmResponse {
  text: string;
  toolCalls: ToolCall[];
}

/** Text in → text (or tool calls) out. One implementation per vendor (or our own model). */
export interface LlmProvider {
  readonly id: string;
  complete(request: LlmRequest): Promise<LlmResponse>;
}
