import { join } from "node:path";
import type { Platform } from "@subx/core";
import { createMacPlatform } from "@subx/platform-mac";
import { createWinPlatform } from "@subx/platform-win";
import { app } from "electron";

/** The Swift helper ships inside the app's Resources; in development it is built in native/. */
function macHelperPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, "subx-mac-helper")
    : join(app.getAppPath(), "../../native/mac-helper/build/subx-mac-helper");
}

/** Picks the OS plug. Everything else in the app only sees the `Platform` interface. */
export function createPlatform(): Platform {
  return process.platform === "win32"
    ? createWinPlatform()
    : createMacPlatform({ helperPath: macHelperPath() });
}
