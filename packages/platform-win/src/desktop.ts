import { type DesktopActions, notImplemented } from "@subx/core";
import { shell } from "electron";

export class WinDesktopActions implements DesktopActions {
  // Plan: look the app up in the Start Menu shortcuts, then shell.openPath it.
  async openApp(): Promise<void> {
    throw notImplemented("windows open app");
  }

  async openUrl(url: string): Promise<void> {
    await shell.openExternal(url);
  }
}
