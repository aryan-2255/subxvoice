import type { PermissionKind, PermissionState, Permissions } from "@subx/core";
import { shell, systemPreferences } from "electron";

export class WinPermissions implements Permissions {
  required(): PermissionKind[] {
    return ["microphone"];
  }

  async status(kind: PermissionKind): Promise<PermissionState> {
    if (kind !== "microphone") return "granted"; // Windows has no such permission.
    // "denied" usually means Settings → Privacy → Microphone → "Let desktop apps access
    // your microphone" is off. Recording then returns silence instead of an error.
    return fromMediaStatus(systemPreferences.getMediaAccessStatus("microphone"));
  }

  async request(kind: PermissionKind): Promise<void> {
    await this.openSettings(kind);
  }

  async openSettings(kind: PermissionKind): Promise<void> {
    await shell.openExternal(
      kind === "microphone" ? "ms-settings:privacy-microphone" : "ms-settings:privacy",
    );
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
