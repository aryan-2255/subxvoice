import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { DesktopActions } from "@subx/core";
import { shell } from "electron";

const run = promisify(execFile);

export class MacDesktopActions implements DesktopActions {
  async openApp(name: string): Promise<void> {
    await run("open", ["-a", name]);
  }

  async openUrl(url: string): Promise<void> {
    await shell.openExternal(url);
  }
}
