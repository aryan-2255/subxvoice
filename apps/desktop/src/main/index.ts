import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type AudioClip,
  type DictionaryEntry,
  type HistoryStore,
  type HotkeyBinding,
  type Mode,
  type PermissionKind,
  Pipeline,
  type SessionRecord,
  SubxError,
} from "@subx/core";
import { app, BrowserWindow, ipcMain, shell, type Tray } from "electron";
import {
  type AppInfo,
  type AppSettings,
  IPC,
  type MicrophoneOption,
  type PermissionStatus,
} from "../shared/ipc";
import { DictationController } from "./dictation";
import { nativeMic, PillMic } from "./mic";
import { PillWindow } from "./pill";
import { createPlatform } from "./platform";
import { createEngines, loadDevEnv } from "./providers";
import { deleteRecording, recordingsDir, saveRecording } from "./recordings";
import { loadPage, PRELOAD_PATH } from "./renderer";
import { JsonDictionaryStore, JsonHistoryStore, JsonSettingsStore } from "./stores";
import { createTray } from "./tray";

const HOTKEY_RETRY_MS = 3000;

loadDevEnv();
const platform = createPlatform();
const engines = createEngines();
/** Reported by the renderer, which is the only side with MediaDevices. */
let microphones: MicrophoneOption[] = [];
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null; // kept in a variable so it isn't garbage-collected

function openMainWindow(): void {
  if (process.platform === "darwin") app.focus({ steal: true });
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 680,
    minWidth: 760,
    minHeight: 520,
    show: false,
    titleBarStyle: platform.os === "mac" ? "hiddenInset" : "default",
    webPreferences: { preload: PRELOAD_PATH, sandbox: true, contextIsolation: true },
  });
  mainWindow.on("ready-to-show", () => mainWindow?.show());
  // Destroyed on close (not hidden) so the app stays light while it runs in the background.
  // The pill and the tray icon keep the app running; quit from the tray menu.
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  loadPage(mainWindow, "index.html");
}

function notifyHistoryChanged(): void {
  mainWindow?.webContents.send(IPC.historyChanged);
}

function assertPermissionKind(kind: unknown): PermissionKind {
  if (!platform.permissions.required().includes(kind as PermissionKind)) {
    throw new Error(`Unknown permission: ${String(kind)}`);
  }
  return kind as PermissionKind;
}

/** When no STT is configured, history still records the clip so nothing the user said is lost. */
async function saveSilentRecord(history: HistoryStore, mode: Mode, clip: AudioClip): Promise<string> {
  const record: SessionRecord = {
    id: randomUUID(),
    createdAt: Date.now(),
    mode,
    context: {},
    rawText: "",
    finalText: "",
    audioMs: Math.round((clip.samples.length / clip.sampleRate) * 1000),
    timings: { sttMs: 0, rulesMs: 0, llmMs: 0, insertMs: 0, totalMs: 0 },
  };
  await history.save(record);
  return record.id;
}

function assertString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 200) throw new Error(`Invalid ${name}`);
  return value.trim();
}

function assertDictionaryEntry(value: unknown): DictionaryEntry {
  const entry = value as Partial<DictionaryEntry> | null;
  const misheardAs = Array.isArray(entry?.misheardAs) ? entry.misheardAs : [];
  return {
    word: assertString(entry?.word, "word"),
    misheardAs: misheardAs.filter((item): item is string => typeof item === "string" && !!item.trim()),
  };
}

/** Settings arrive from the renderer, so every field is checked before it is stored. */
function assertSettings(value: unknown, supportedKeys: string[]): Partial<AppSettings> {
  const input = (value ?? {}) as Partial<AppSettings>;
  const patch: Partial<AppSettings> = {};
  if (typeof input.hotkey === "string") {
    if (!supportedKeys.includes(input.hotkey)) throw new Error(`Unsupported hotkey: ${input.hotkey}`);
    patch.hotkey = input.hotkey;
  }
  if (input.script === "native" || input.script === "roman") patch.script = input.script;
  if (typeof input.microphoneId === "string" && input.microphoneId.length <= 200) {
    patch.microphoneId = input.microphoneId;
  }
  return patch;
}

async function start(): Promise<void> {
  const dataDir = app.getPath("userData");
  await mkdir(dataDir, { recursive: true });
  const history = new JsonHistoryStore(join(dataDir, "history.json"));
  const dictionary = new JsonDictionaryStore(join(dataDir, "dictionary.json"));
  const settings = new JsonSettingsStore<AppSettings>(join(dataDir, "settings.json"), {
    hotkey: platform.hotkey.defaultBindings()[0]?.keys ?? "",
    script: "roman",
    microphoneId: "",
  });

  const bindings = async (): Promise<HotkeyBinding[]> => {
    const { hotkey } = await settings.all();
    const supported = platform.hotkey.supportedKeys();
    if (!hotkey || !supported.includes(hotkey)) return platform.hotkey.defaultBindings();
    return [{ keys: hotkey, mode: "exact" }];
  };

  ipcMain.handle(
    IPC.appInfo,
    async (): Promise<AppInfo> => ({
      version: app.getVersion(),
      hotkeys: await bindings(),
      supportedKeys: platform.hotkey.supportedKeys(),
      providers: { stt: !!engines.stt, llm: !!engines.llm },
      nativeMicrophone: !!platform.microphone,
    }),
  );
  ipcMain.handle(IPC.openRecordingsFolder, async () => {
    await mkdir(recordingsDir(), { recursive: true });
    await shell.openPath(recordingsDir());
  });

  ipcMain.handle(IPC.permissionList, async (): Promise<PermissionStatus[]> => {
    const kinds = platform.permissions.required();
    return Promise.all(kinds.map(async (kind) => ({ kind, state: await platform.permissions.status(kind) })));
  });
  ipcMain.handle(IPC.permissionRequest, (_event, kind: unknown) =>
    platform.permissions.request(assertPermissionKind(kind)),
  );
  ipcMain.handle(IPC.permissionOpenSettings, (_event, kind: unknown) =>
    platform.permissions.openSettings(assertPermissionKind(kind)),
  );

  ipcMain.handle(IPC.historyList, () => history.recent(Number.MAX_SAFE_INTEGER));
  ipcMain.handle(IPC.historyAudio, async (_event, id: unknown) => {
    const record = await history.find(assertString(id, "id"));
    if (!record?.audioPath) throw new Error("This recording has no audio");
    return readFile(record.audioPath);
  });
  ipcMain.handle(IPC.historyRemove, async (_event, id: unknown) => {
    const record = await history.find(assertString(id, "id"));
    if (!record) return;
    if (record.audioPath) await deleteRecording(record.audioPath);
    await history.remove(record.id);
    notifyHistoryChanged();
  });

  ipcMain.handle(IPC.dictionaryList, () => dictionary.all());
  ipcMain.handle(IPC.dictionaryUpsert, (_event, entry: unknown) =>
    dictionary.upsert(assertDictionaryEntry(entry)),
  );
  ipcMain.handle(IPC.dictionaryRemove, (_event, word: unknown) =>
    dictionary.remove(assertString(word, "word")),
  );

  const pill = new PillWindow();
  // Native mic when the OS plug has one (Mac: Swift helper); otherwise Web Audio in the pill.
  const pillMic = new PillMic(pill);
  const mic = platform.microphone ? nativeMic(platform.microphone) : pillMic;
  const pipeline = engines.stt
    ? new Pipeline({
        stt: engines.stt,
        llm: engines.llm,
        inserter: platform.inserter,
        history,
        dictionary,
      })
    : null;

  const keepAudio = async (clip: AudioClip, id: string) => {
    // Saved after the text is already at the cursor, so disk I/O never delays the paste.
    const audioMs = Math.round((clip.samples.length / clip.sampleRate) * 1000);
    await history.attachAudio(id, await saveRecording(clip), audioMs);
    notifyHistoryChanged();
  };

  const dictation = new DictationController(pill, mic, {
    async open(mode) {
      // STT stream and the LLM connection open now, on key-press, so release→paste is just the tail.
      if (!pipeline) {
        return {
          push: () => {},
          finish: async (clip) => {
            await keepAudio(clip, await saveSilentRecord(history, mode, clip));
            return engines.problems[0] ?? "Speech-to-text is not configured";
          },
          cancel: () => {},
        };
      }
      const { script } = await settings.all();
      const context = await platform.context.current().catch(() => ({}));
      const session = await pipeline.open(mode, context, {
        script,
        // Show the words as heard while the model is still cleaning them up.
        onTranscript: (text) => pill.setState({ kind: "processing", message: text }),
      });
      return {
        push: (samples) => session.push(samples),
        finish: async (clip) => {
          const outcome = await session.finish();
          if (outcome.kind === "empty") return "Nothing heard";
          if (outcome.kind === "command") return `Command: ${outcome.command}`;
          notifyHistoryChanged();
          void keepAudio(clip, outcome.record.id);
          // Saved to history either way; the pill shows why the text didn't appear.
          if (outcome.pasteError) throw new Error(outcome.pasteError);
          return outcome.record.finalText;
        },
        cancel: () => {
          // Drain the stream so the socket closes instead of leaking.
          void session.finish().catch(() => {});
        },
      };
    },
  });

  ipcMain.handle(IPC.settingsGet, () => settings.all());
  ipcMain.handle(IPC.settingsSet, async (_event, patch: unknown) => {
    const next = await settings.update(assertSettings(patch, platform.hotkey.supportedKeys()));
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IPC.settingsChanged, next);
    }
    await registerHotkey();
    return next;
  });
  ipcMain.handle(IPC.microphoneList, () => microphones);
  ipcMain.on(IPC.microphonePublish, (_event, options: unknown) => {
    microphones = Array.isArray(options)
      ? options
          .filter((item): item is MicrophoneOption => !!item && typeof item.id === "string")
          .map((item) => ({ id: String(item.id), label: String(item.label ?? "Microphone") }))
          .slice(0, 50)
      : [];
  });

  ipcMain.on(IPC.pillHover, (event, inside: unknown) => {
    if (pill.owns(event.sender)) pill.setHover(inside === true);
  });
  ipcMain.on(IPC.pillClick, (event) => {
    if (pill.owns(event.sender)) openMainWindow();
  });
  ipcMain.on(IPC.micChunk, (event, samples: Int16Array) => {
    if (pill.owns(event.sender)) pillMic.receive(samples);
  });
  ipcMain.on(IPC.micStopped, (event) => {
    if (pill.owns(event.sender)) pillMic.stopped();
  });
  ipcMain.on(IPC.micError, (event, message: string) => {
    if (pill.owns(event.sender)) pillMic.failed(String(message));
  });

  let hotkeyRetry: NodeJS.Timeout | undefined;
  const registerHotkey = async (): Promise<void> => {
    // One retry loop at most, even when a settings change re-registers while a retry is pending.
    clearTimeout(hotkeyRetry);
    await platform.hotkey
      .register(await bindings(), (event) => dictation.handleHotkey(event))
      .catch((error: unknown) => {
        // Missing permission: keep trying, so the hotkey starts working as soon as it is granted.
        if (error instanceof SubxError && error.code === "permission_denied") {
          hotkeyRetry = setTimeout(registerHotkey, HOTKEY_RETRY_MS);
        } else {
          console.error("Hotkey unavailable:", error);
        }
      });
  };
  void registerHotkey();

  tray = createTray(openMainWindow);
  openMainWindow();
}

app.whenReady().then(() => {
  void start();
  app.on("activate", openMainWindow);
});

app.on("will-quit", () => {
  tray?.destroy();
  void platform.hotkey.unregisterAll();
});
