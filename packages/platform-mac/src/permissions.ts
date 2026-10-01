import type { PermissionKind, PermissionState, Permissions } from "@subx/core";
import { shell, systemPreferences } from "electron";
import type { HelperMessage, MacHelper } from "./helper";

const SETTINGS = "x-apple.systempreferences:com.apple.preference.security";

const SETTINGS_URL: Record<PermissionKind, string> = {
  microphone: `${SETTINGS}?Privacy_Microphone`,
  accessibility: `${SETTINGS}?Privacy_Accessibility`,
  input_monitoring: `${SETTINGS}?Privacy_ListenEvent`,
  screen_recording: `${SETTINGS}?Privacy_ScreenCapture`,
};

export class MacPermissions implements Permissions {
  private readonly helper: MacHelper;

  constructor(helper: MacHelper) {
    this.helper = helper;
  }

  required(): PermissionKind[] {
    return ["microphone", "accessibility", "input_monitoring"];
  }

  async status(kind: PermissionKind): Promise<PermissionState> {
    switch (kind) {
      case "microphone":
        return fromMediaStatus(systemPreferences.getMediaAccessStatus("microphone"));
      case "screen_recording":
        return fromMediaStatus(systemPreferences.getMediaAccessStatus("screen"));
      case "accessibility":
        return systemPreferences.isTrustedAccessibilityClient(false) ? "granted" : "denied";
      case "input_monitoring": {
        // Electron can't read this one; the Swift helper can.
        const reply = await this.helper.request(
          { cmd: "permissions" },
          (message): message is Extract<HelperMessage, { type: "permissions" }> =>
            message.type === "permissions",
        );
        return (reply.permissions.input_monitoring as PermissionState | undefined) ?? "unknown";
      }
    }
  }

  async request(kind: PermissionKind): Promise<void> {
    if (kind === "microphone") {
      await systemPreferences.askForMediaAccess("microphone");
    } else if (kind === "accessibility") {
      // Shows macOS's own prompt that links to System Settings.
      systemPreferences.isTrustedAccessibilityClient(true);
    } else if (kind === "input_monitoring" && (await this.status(kind)) === "not_asked") {
      this.helper.send({ cmd: "request", permission: "input_monitoring" });
    } else {
      await this.openSettings(kind);
    }
  }

  async openSettings(kind: PermissionKind): Promise<void> {
    await shell.openExternal(SETTINGS_URL[kind]);
  }
}

function fromMediaStatus(status: string): PermissionState {
  switch (status) {
    case "granted":
      return "granted";
    case "not-determined":
      return "not_asked";
    case "denied":
    case "restricted":
      return "denied";
    default:
      return "unknown";
  }
}
