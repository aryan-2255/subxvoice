import type { Platform } from "@subx/core";
import { MacContextReader } from "./context";
import { MacDesktopActions } from "./desktop";
import { MacHelper } from "./helper";
import { MacHotkey } from "./hotkey";
import { MacInserter } from "./inserter";
import { MacMicrophone } from "./microphone";
import { MacPermissions } from "./permissions";

export interface MacPlatformOptions {
  /** Path to the built Swift helper (native/mac-helper). */
  helperPath: string;
}

export function createMacPlatform({ helperPath }: MacPlatformOptions): Platform {
  const helper = new MacHelper(helperPath);
  return {
    os: "mac",
    hotkey: new MacHotkey(helper),
    microphone: new MacMicrophone(helper),
    inserter: new MacInserter(helper),
    permissions: new MacPermissions(helper),
    context: new MacContextReader(),
    desktop: new MacDesktopActions(),
  };
}
