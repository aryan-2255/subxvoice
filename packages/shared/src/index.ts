// Shared between the desktop app, the website and (later) the backend.

export const GITHUB_REPO = "aryan-2255/subxvoice";

/** Must match `artifactName` in apps/desktop/electron-builder.yml. */
export const DOWNLOAD_FILES = {
  mac: "SUBXVoice-mac.dmg",
  win: "SUBXVoice-windows-setup.exe",
} as const;

export type DesktopOs = keyof typeof DOWNLOAD_FILES;

/** Always points at the newest GitHub release, so the website never needs a redeploy. */
export function downloadUrl(os: DesktopOs): string {
  return `https://github.com/${GITHUB_REPO}/releases/latest/download/${DOWNLOAD_FILES[os]}`;
}
