// Windows-only window chrome. Same exports as platform/mac/Chrome.tsx.

/** Windows keeps its native title bar, so the sidebar starts with the app name. */
export function SidebarTop() {
  return <p className="px-2.5 pt-4 pb-3 text-sm font-semibold">SUBXVoice</p>;
}

/** Windows has a native title bar; the content area does not need to drag the window. */
export const TITLE_BAR_DRAG = "";

export function PermissionsIntro() {
  return (
    <p className="text-muted">
      Allow microphone access in Windows Settings. Text can't be typed into apps that run as administrator.
    </p>
  );
}

export function HotkeyNote() {
  return null;
}

export function MicrophoneNote() {
  return (
    <p>
      The microphone stays ready for a minute after you dictate, so your first word is never cut off. Windows
      shows the microphone icon during that minute.
    </p>
  );
}
