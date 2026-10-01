/**
 * MCP support — not built yet. Two directions:
 *
 * Client: connect to MCP servers the user adds in Settings. Every tool a server offers is
 * registered in core's ToolRegistry with `source: { kind: "mcp", server }`, so the LLM can
 * use it like any built-in action (Mac control, Slack, Notion, browser…).
 *
 * Server: expose the user's history and dictionary (read-only, user-approved) so other AI
 * assistants can ask things like "what did I dictate yesterday?".
 */

/** Same shape as Claude Desktop's `mcpServers` entries, so users can paste existing configs. */
export type McpServerConfig =
  | { name: string; command: string; args?: string[]; env?: Record<string, string> }
  | { name: string; url: string; headers?: Record<string, string> };
