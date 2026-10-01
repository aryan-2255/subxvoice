import { HotkeyNote, MicrophoneNote, PermissionsIntro } from "@platform/Chrome";
import type { ReactNode } from "react";
import type { AppInfo } from "../../../shared/ipc";
import { Choice } from "../shared/Choice";
import { hotkeyLabel } from "../shared/format";
import { useMicrophones, useSettings } from "../shared/hooks";
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

const SCRIPTS = [
  {
    value: "native",
    label: "The language's own script",
    hint: "Hindi is written in Devanagari — मैं ठीक हूँ",
  },
  {
    value: "roman",
    label: "Roman letters",
    hint: "Hindi is spelled out in English letters — main theek hoon",
  },
];

export function SettingsPage({ info }: { info: AppInfo | null }) {
  const [settings, update] = useSettings();
  const microphones = useMicrophones();
  const hotkey = hotkeyLabel(info?.hotkeys[0]?.keys);

  return (
    <>
      <PageHeader title="Settings" />

      <Row title="Hotkey">
        <p>
          Hold <kbd className="rounded border border-line px-1.5 py-0.5 font-sans">{hotkey}</kbd> to dictate,
          and let go to stop. Press any other key while holding to cancel.
        </p>
        <Choice
          name="hotkey"
          value={settings?.hotkey ?? ""}
          onChange={(value) => update({ hotkey: value })}
          options={(info?.supportedKeys ?? []).map((keys) => ({ value: keys, label: hotkeyLabel(keys) }))}
        />
        <HotkeyNote />
      </Row>

      <Row title="Written as">
        <p>How languages that don't use Latin letters are written down. Your words are never translated.</p>
        <Choice
          name="script"
          value={settings?.script ?? "native"}
          onChange={(value) => update({ script: value === "roman" ? "roman" : "native" })}
          options={SCRIPTS}
        />
        {info && !info.providers.llm && settings?.script === "roman" && (
          <p className="text-muted">Needs OPENROUTER_API_KEY — see the Engines section below.</p>
        )}
      </Row>

      <Row title="Microphone">
        {/* With a native mic (Mac) the system input device is used, so the picker would do nothing. */}
        {info && !info.nativeMicrophone && (
          <Choice
            name="microphone"
            value={settings?.microphoneId ?? ""}
            onChange={(value) => update({ microphoneId: value })}
            options={[
              { value: "", label: "System default" },
              ...microphones.map((option) => ({ value: option.id, label: option.label })),
            ]}
            empty="No microphone found. Allow microphone access, then reopen this page."
          />
        )}
        <MicrophoneNote />
      </Row>

      <Row title="Permissions">
        <PermissionsIntro />
        <PermissionList />
      </Row>

      <Row title="Engines">
        <EngineStatus ready={info?.providers.stt} name="Speech-to-text" env="SONIOX_API_KEY" />
        <EngineStatus
          ready={info?.providers.llm}
          name="Rewriting and Roman script"
          env="OPENROUTER_API_KEY"
        />
        <p className="text-muted">
          Keys are read from <code>.env</code> at the repo root while the backend is being built. Restart the
          app after changing them.
        </p>
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
        <p className="tabular-nums">SUBXVoice {info?.version ?? ""}</p>
      </Row>
    </>
  );
}

function EngineStatus({ ready, name, env }: { ready: boolean | undefined; name: string; env: string }) {
  return (
    <p className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${ready ? "bg-emerald-500" : "bg-amber-500"}`} />
      <span className="font-medium">{name}</span>
      <span className="text-muted">{ready ? "ready" : `off — set ${env}`}</span>
    </p>
  );
}
