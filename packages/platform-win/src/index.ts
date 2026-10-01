import type { Platform } from "@subx/core";
import { WinContextReader } from "./context";
import { WinDesktopActions } from "./desktop";
import { WinHotkey } from "./hotkey";
import { WinInserter } from "./inserter";
import { WinPermissions } from "./permissions";

export function createWinPlatform(): Platform {
  return {
    os: "win",
    hotkey: new WinHotkey(),
    inserter: new WinInserter(),
    permissions: new WinPermissions(),
    context: new WinContextReader(),
    desktop: new WinDesktopActions(),
  };
}
