import { type ChildProcess, spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { SubxError } from "@subx/core";

export type HelperMessage =
  | { type: "ready" }
  | { type: "watching"; keys: string[] }
  | { type: "key"; key: string; down: boolean }
  | { type: "audio"; data: string; level: number; latencyMs?: number }
  | { type: "mic_started" }
  | { type: "mic_stopped" }
  | { type: "pasted" }
  | { type: "permissions"; permissions: Record<string, string> }
  | { type: "error"; code: string; message: string };

type Listener = (message: HelperMessage) => void;

const REPLY_TIMEOUT_MS = 3000;

/**
 * The Swift helper in native/mac-helper: hotkey, microphone and permission checks. One process
 * for the whole app, talking one JSON object per line over stdin/stdout. It exits when the app
 * quits (stdin closes) and is restarted on the next command if it ever crashes.
 */
export class MacHelper {
  private readonly path: string;
  private readonly listeners = new Set<Listener>();
  private child: ChildProcess | null = null;

  constructor(path: string) {
    this.path = path;
  }

  send(command: Record<string, unknown>): void {
    this.running().stdin?.write(`${JSON.stringify(command)}\n`);
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Sends a command and waits for the first reply that `match` accepts. */
  request<T extends HelperMessage>(
    command: Record<string, unknown>,
    match: (message: HelperMessage) => message is T,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new SubxError("provider", `Mac helper did not answer "${String(command.cmd)}"`));
      }, REPLY_TIMEOUT_MS);
      const off = this.on((message) => {
        if (!match(message)) return;
        clearTimeout(timer);
        off();
        resolve(message);
      });
      this.send(command);
    });
  }

  private running(): ChildProcess {
    if (this.child) return this.child;
    const child = spawn(this.path, [], { stdio: ["pipe", "pipe", "inherit"] });
    if (child.stdout) {
      createInterface({ input: child.stdout }).on("line", (line) => {
        let message: HelperMessage;
        try {
          message = JSON.parse(line) as HelperMessage;
        } catch {
          return;
        }
        for (const listener of this.listeners) listener(message);
      });
    }
    child.on("error", (error) => {
      console.error(`Mac helper failed to start (${this.path}):`, error.message);
    });
    child.on("exit", () => {
      if (this.child === child) this.child = null;
    });
    this.child = child;
    return child;
  }
}
