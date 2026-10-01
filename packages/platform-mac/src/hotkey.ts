import { type Hotkey, type HotkeyBinding, type HotkeyEvent, type Mode, SubxError } from "@subx/core";
import type { HelperMessage, MacHelper } from "./helper";

/** Keys the Swift helper can watch. */
const SUPPORTED = new Set(["fn", "right_option", "left_option", "right_command", "right_ctrl", "left_ctrl"]);

/**
 * Hold-to-talk through the Swift helper's event tap (needs Input Monitoring). Pressing any other key
 * while holding sends "cancel", so shortcuts such as fn+F5 keep working.
 */
export class MacHotkey implements Hotkey {
  private readonly helper: MacHelper;
  private modes = new Map<string, Mode>();
  private onEvent: (event: HotkeyEvent) => void = () => {};
  private held: Mode | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(helper: MacHelper) {
    this.helper = helper;
  }

  /** fn (🌐), like Wispr Flow and Willow. */
  defaultBindings(): HotkeyBinding[] {
    return [{ keys: "fn", mode: "exact" }];
  }

  supportedKeys(): string[] {
    return [...SUPPORTED];
  }

  async register(bindings: HotkeyBinding[], onEvent: (event: HotkeyEvent) => void): Promise<void> {
    for (const { keys } of bindings) {
      if (!SUPPORTED.has(keys)) throw new SubxError("unsupported", `Unsupported hotkey: ${keys}`);
    }
    this.modes = new Map(bindings.map((binding) => [binding.keys, binding.mode]));
    this.onEvent = onEvent;
    this.unsubscribe ??= this.helper.on((message) => {
      if (message.type === "key") this.handleKey(message.key, message.down);
    });

    const reply = await this.helper.request(
      { cmd: "watch", keys: [...this.modes.keys()] },
      (message): message is Extract<HelperMessage, { type: "watching" | "error" }> =>
        message.type === "watching" || (message.type === "error" && message.code === "tap_failed"),
    );
    if (reply.type === "error") throw new SubxError("permission_denied", reply.message);
  }

  async unregisterAll(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.modes.clear();
    this.held = null;
    this.helper.send({ cmd: "watch", keys: [] });
  }

  private handleKey(key: string, down: boolean): void {
    const mode = this.modes.get(key);
    if (mode !== undefined) {
      if (down && this.held === null) {
        this.held = mode;
        this.onEvent({ type: "pressed", mode });
      } else if (!down && this.held === mode) {
        this.held = null;
        this.onEvent({ type: "released", mode });
      }
      return;
    }
    if (key === "other" && this.held !== null) {
      this.held = null;
      this.onEvent({ type: "cancel" });
    }
  }
}
