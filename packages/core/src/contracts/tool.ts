export type ToolSource = { kind: "builtin" } | { kind: "platform" } | { kind: "mcp"; server: string };

export interface ToolSpec {
  /** Unique, snake_case, e.g. "open_app" or "slack_send_message". */
  name: string;
  /** Shown to the LLM — say what it does and when to use it. */
  description: string;
  /** JSON Schema for `call`'s input. */
  inputSchema: Record<string, unknown>;
  /** "confirm" = ask the user before running (sending, deleting, buying…). */
  risk: "safe" | "confirm";
  source: ToolSource;
}

/** Anything SUBXVoice can *do*: a built-in action, an OS action, or a tool from an MCP server. */
export interface Tool {
  readonly spec: ToolSpec;
  call(input: unknown): Promise<unknown>;
}
