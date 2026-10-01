import type { PermissionKind } from "@subx/core";
import { usePermissions } from "./hooks";

const LABELS: Record<PermissionKind, { title: string; why: string }> = {
  microphone: { title: "Microphone", why: "To hear what you say." },
  accessibility: { title: "Accessibility", why: "To type the text into the app you are using." },
  input_monitoring: { title: "Input Monitoring", why: "To notice when you hold the hotkey." },
  screen_recording: { title: "Screen Recording", why: "To understand what is on your screen." },
};

/** The permissions this OS needs, updating live as the user grants them. */
export function PermissionList() {
  const statuses = usePermissions() ?? [];

  return (
    <ul className="divide-y divide-line rounded-lg border border-line">
      {statuses.map(({ kind, state }) => (
        <li key={kind} className="flex items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="font-medium">{LABELS[kind].title}</p>
            <p className="text-muted">{LABELS[kind].why}</p>
          </div>
          {state === "granted" && <span className="text-muted">Allowed</span>}
          {state === "unknown" && (
            <button
              type="button"
              className="shrink-0 text-accent hover:underline"
              onClick={() => window.subx.permissions.openSettings(kind)}
            >
              Check in Settings
            </button>
          )}
          {(state === "denied" || state === "not_asked") && (
            <button
              type="button"
              className="shrink-0 rounded-md bg-accent px-3 py-1.5 font-medium text-white hover:opacity-90"
              onClick={() =>
                state === "not_asked"
                  ? window.subx.permissions.request(kind)
                  : window.subx.permissions.openSettings(kind)
              }
            >
              {state === "not_asked" ? "Allow" : "Open Settings"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
