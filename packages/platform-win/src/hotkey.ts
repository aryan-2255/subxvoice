import { type Hotkey, type HotkeyBinding, notImplemented } from "@subx/core";

// Plan: same approach as platform-mac/src/hotkey.ts (uiohook-napi keydown/keyup, any other key
// cancels). No permission needed on Windows. Default binding: Ctrl + Win.
export class WinHotkey implements Hotkey {
  defaultBindings(): HotkeyBinding[] {
    return [{ keys: "ctrl+win", mode: "exact" }];
  }

  async register(): Promise<void> {
    throw notImplemented("windows hotkey");
  }

  async unregisterAll(): Promise<void> {}
}
