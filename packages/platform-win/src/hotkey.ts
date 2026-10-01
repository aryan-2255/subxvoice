import { type Hotkey, type HotkeyBinding, notImplemented } from "@subx/core";

// Plan: uiohook-napi keydown/keyup (no permission needed on Windows). Same hold/cancel logic as
// platform-mac/src/hotkey.ts: pressed when Ctrl + Win are both down, released when either goes up,
// cancel when any other key is pressed meanwhile. See docs/WINDOWS.md, task 1.
export class WinHotkey implements Hotkey {
  defaultBindings(): HotkeyBinding[] {
    return [{ keys: "ctrl+win", mode: "exact" }];
  }

  async register(): Promise<void> {
    throw notImplemented("windows hotkey");
  }

  async unregisterAll(): Promise<void> {}
}
