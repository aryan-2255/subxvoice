import { type Hotkey, type HotkeyBinding, type HotkeyEvent, type Mode, SubxError } from "@subx/core";
import { isKeyDown, VK } from "./win32";

const POLL_MS = 15; // imperceptible next to a ~800 ms pipeline

/** A key name maps to the virtual keys that satisfy it — either side of the keyboard counts. */
const KEYS: Record<string, number[]> = {
  ctrl: [VK.control],
  shift: [VK.shift],
  alt: [VK.alt],
  win: [VK.lwin, VK.rwin],
};

/** Mouse buttons live below 0x07 and must never count as "some other key". */
const SCAN_FIRST = 0x08;
const SCAN_LAST = 0xfe;

export function parseBinding(keys: string): number[][] {
  const groups = keys
    .toLowerCase()
    .split("+")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => KEYS[name]);
  if (groups.length === 0 || groups.some((group) => !group)) {
    throw new SubxError("unsupported", `Unsupported hotkey: ${keys}`);
  }
  return groups as number[][];
}

/**
 * Hold-to-talk by polling real key state — see win32.ts for why this is not a keyboard hook.
 * Pressing any other key while holding sends "cancel", so Win+Ctrl+Left still switches desktops.
 */
export class WinHotkey implements Hotkey {
  private timer: NodeJS.Timeout | null = null;
  private bindings: { groups: number[][]; own: Set<number>; mode: Mode }[] = [];
  private held: Mode | null = null;
  private cancelled = false;
  private readonly down: (vk: number) => boolean;

  /** `down` is injectable so the state machine can be tested without a keyboard. */
  constructor(down: (vk: number) => boolean = isKeyDown) {
    this.down = down;
  }

  /** Ctrl + Win: no Windows shortcut uses the pair on its own. */
  defaultBindings(): HotkeyBinding[] {
    return [{ keys: "ctrl+win", mode: "exact" }];
  }

  supportedKeys(): string[] {
    return ["ctrl+win", "ctrl+alt", "alt+win", "ctrl+shift+alt"];
  }

  async register(bindings: HotkeyBinding[], onEvent: (event: HotkeyEvent) => void): Promise<void> {
    this.bindings = bindings.map((binding) => {
      const groups = parseBinding(binding.keys);
      return { groups, own: new Set(groups.flat()), mode: binding.mode };
    });
    await this.unregisterAll();
    this.timer = setInterval(() => this.tick(onEvent), POLL_MS);
    // Polling must never hold up quitting.
    this.timer.unref?.();
  }

  async unregisterAll(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.held = null;
    this.cancelled = false;
  }

  /** One poll. Exposed for tests; the interval calls it. */
  tick(onEvent: (event: HotkeyEvent) => void): void {
    if (this.held === null) {
      const match = this.bindings.find((b) => b.groups.every((g) => g.some(this.down)));
      if (!match) return;
      this.held = match.mode;
      this.cancelled = false;
      onEvent({ type: "pressed", mode: match.mode });
      return;
    }

    const binding = this.bindings.find((item) => item.mode === this.held);
    const stillDown = binding?.groups.every((group) => group.some(this.down)) ?? false;
    if (!stillDown) {
      const mode = this.held;
      this.held = null;
      if (!this.cancelled) onEvent({ type: "released", mode });
      this.cancelled = false;
      return;
    }
    // Only scan the whole keyboard while the hotkey is actually held — a rare, short window.
    if (!this.cancelled && binding && anyOtherKeyDown(binding.own, this.down)) {
      this.cancelled = true;
      onEvent({ type: "cancel" });
    }
  }
}

/**
 * Ctrl, Shift and Alt each report through a generic code *and* a side-specific one. Holding the
 * binding's own Ctrl would otherwise look like "some other key" and cancel every dictation.
 */
const SIBLINGS: Record<number, number[]> = {
  [VK.control]: [0xa2, 0xa3],
  [VK.shift]: [0xa0, 0xa1],
  [VK.alt]: [0xa4, 0xa5],
};

export function anyOtherKeyDown(own: Set<number>, down: (vk: number) => boolean = isKeyDown): boolean {
  const ignore = new Set(own);
  for (const vk of own) for (const sibling of SIBLINGS[vk] ?? []) ignore.add(sibling);
  for (let vk = SCAN_FIRST; vk <= SCAN_LAST; vk += 1) {
    if (!ignore.has(vk) && down(vk)) return true;
  }
  return false;
}
