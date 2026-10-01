import type { Tool, ToolSpec } from "./contracts/tool";

/**
 * One list of everything SUBXVoice can do. Built-in actions, OS actions and every MCP
 * server's tools all register here; the LLM picks from `list()`.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): void {
    if (this.tools.has(tool.spec.name)) {
      throw new Error(`Tool already registered: ${tool.spec.name}`);
    }
    this.tools.set(tool.spec.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): ToolSpec[] {
    return [...this.tools.values()].map((tool) => tool.spec);
  }
}
