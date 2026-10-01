import { HotkeyNote, MicrophoneNote, PermissionsIntro } from "@platform/Chrome";
import type { ReactNode } from "react";
import { PageHeader } from "../shared/PageHeader";
import { PermissionList } from "../shared/PermissionList";

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-[180px_1fr] gap-6 border-t border-line py-6">
      <h2 className="font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function SettingsPage({ hotkey, version }: { hotkey: string; version: string }) {
  return (
    <>
      <PageHeader title="Settings" />
      <Row title="Hotkey">
        <p>
          Hold <kbd className="rounded border border-line px-1.5 py-0.5 font-sans">{hotkey}</kbd> to dictate,
          and let go to stop. Press any other key while holding to cancel.
        </p>
        <HotkeyNote />
        <p className="text-muted">Choosing your own hotkey is coming soon.</p>
      </Row>
      <Row title="Permissions">
        <PermissionsIntro />
        <PermissionList />
      </Row>
      <Row title="Microphone">
        <MicrophoneNote />
      </Row>
      <Row title="Recordings">
        <p>Recordings are saved only on this computer. Delete any of them from History.</p>
        <button
          type="button"
          onClick={() => window.subx.app.openRecordingsFolder()}
          className="rounded-md border border-line px-3 py-1.5 font-medium hover:bg-ink/[0.04]"
        >
          Open recordings folder
        </button>
      </Row>
      <Row title="About">
        <p className="tabular-nums">SUBXVoice {version}</p>
      </Row>
    </>
  );
}
