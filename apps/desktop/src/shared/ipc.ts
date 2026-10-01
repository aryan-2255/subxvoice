// The contract between the UI (renderer) and the main process. Main, preload and renderer
// all import from here, so channel names and types can't drift apart.
import type {
  DictionaryEntry,
  HotkeyBinding,
  PermissionKind,
  PermissionState,
  SessionRecord,
} from "@subx/core";

export const IPC = {
  appInfo: "app:info",
  openRecordingsFolder: "app:open-recordings-folder",
  permissionList: "permissions:list",
  permissionRequest: "permissions:request",
  permissionOpenSettings: "permissions:open-settings",
  historyList: "history:list",
  historyAudio: "history:audio",
  historyRemove: "history:remove",
  historyChanged: "history:changed",
  dictionaryList: "dictionary:list",
  dictionaryUpsert: "dictionary:upsert",
  dictionaryRemove: "dictionary:remove",
  // main → pill
  pillState: "pill:state",
  pillLevel: "pill:level",
  micCommand: "mic:command",
  // pill → main
  pillHover: "pill:hover",
  pillClick: "pill:click",
  micChunk: "mic:chunk",
  micStopped: "mic:stopped",
  micError: "mic:error",
} as const;

export interface AppInfo {
  version: string;
  hotkeys: HotkeyBinding[];
}

export interface PermissionStatus {
  kind: PermissionKind;
  state: PermissionState;
}

export type PillState =
  | { kind: "idle" }
  | { kind: "listening" }
  | { kind: "processing" }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

export type MicCommand = "start" | "stop";

/** Exposed to the UI as `window.subx` by the preload script. */
export interface SubxApi {
  os: "mac" | "win";
  app: {
    info(): Promise<AppInfo>;
    openRecordingsFolder(): Promise<void>;
  };
  permissions: {
    list(): Promise<PermissionStatus[]>;
    request(kind: PermissionKind): Promise<void>;
    openSettings(kind: PermissionKind): Promise<void>;
  };
  history: {
    list(): Promise<SessionRecord[]>;
    /** WAV bytes of a recording. */
    audio(id: string): Promise<Uint8Array>;
    remove(id: string): Promise<void>;
    onChanged(listener: () => void): () => void;
  };
  dictionary: {
    list(): Promise<DictionaryEntry[]>;
    upsert(entry: DictionaryEntry): Promise<void>;
    remove(word: string): Promise<void>;
  };
  /** Used only by the recording pill window. The mic commands are for the Web Audio fallback. */
  pill: {
    onState(listener: (state: PillState) => void): () => void;
    /** Loudness 0–1 while listening, for the waveform. */
    onLevel(listener: (level: number) => void): () => void;
    onMicCommand(listener: (command: MicCommand) => void): () => void;
    hover(inside: boolean): void;
    click(): void;
    /** 16 kHz mono PCM. */
    sendChunk(samples: Int16Array): void;
    /** All audio has been sent after a "stop". */
    micStopped(): void;
    micError(message: string): void;
  };
}
