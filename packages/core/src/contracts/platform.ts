import type { AppContext, AudioClip, Mode } from "../types";

export type HotkeyEvent =
  | { type: "pressed"; mode: Mode }
  | { type: "released"; mode: Mode }
  | { type: "cancel" };

export interface HotkeyBinding {
  /** e.g. "fn", "right_option", "ctrl+win". */
  keys: string;
  mode: Mode;
}

export interface Hotkey {
  /** This OS's default hold-to-talk keys, used until the user picks their own. */
  defaultBindings(): HotkeyBinding[];
  /**
   * Every `keys` value this OS can watch, so Settings can offer the same picker on both. The
   * vocabulary differs per OS — "fn" on Mac, "ctrl+win" on Windows — but the UI does not.
   */
  supportedKeys(): string[];
  register(bindings: HotkeyBinding[], onEvent: (event: HotkeyEvent) => void): Promise<void>;
  unregisterAll(): Promise<void>;
}

/** Records 16 kHz mono PCM only between start() and stop(). */
export interface Microphone {
  start(onChunk: (samples: Int16Array) => void): Promise<void>;
  stop(): Promise<AudioClip>;
}

/** Puts text at the user's cursor in whatever app is focused. */
export interface TextInserter {
  insert(text: string): Promise<void>;
}

export type PermissionKind = "microphone" | "accessibility" | "input_monitoring" | "screen_recording";
export type PermissionState = "granted" | "denied" | "not_asked" | "unknown";

export interface Permissions {
  /** The permissions this OS needs, in the order onboarding asks for them. */
  required(): PermissionKind[];
  status(kind: PermissionKind): Promise<PermissionState>;
  request(kind: PermissionKind): Promise<void>;
  openSettings(kind: PermissionKind): Promise<void>;
}

export interface ContextReader {
  current(): Promise<AppContext>;
}

/** OS actions that voice commands can trigger. Exposed to the LLM as tools. */
export interface DesktopActions {
  openApp(name: string): Promise<void>;
  openUrl(url: string): Promise<void>;
}

/** Everything that differs between macOS and Windows. Each OS package returns one of these. */
export interface Platform {
  os: "mac" | "win" | "fake";
  hotkey: Hotkey;
  /**
   * Native microphone. Optional: without it the desktop app records through Chromium's Web Audio,
   * which opens the mic more slowly (~300 ms).
   */
  microphone?: Microphone;
  inserter: TextInserter;
  permissions: Permissions;
  context: ContextReader;
  desktop: DesktopActions;
}
