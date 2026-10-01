import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { type DictionaryEntry, type PermissionKind, type SessionRecord, SubxError } from "@subx/core";
import { app, BrowserWindow, ipcMain, shell, type Tray } from "electron";
import { type AppInfo, IPC, type PermissionStatus } from "../shared/ipc";
import { DictationController } from "./dictation";
import { nativeMic, PillMic } from "./mic";
import { PillWindow } from "./pill";
import { createPlatform } from "./platform";
import { deleteRecording, recordingsDir, saveRecording } from "./recordings";
import { loadPage, PRELOAD_PATH } from "./renderer";
import { JsonDictionaryStore, JsonHistoryStore } from "./stores";
import { createTray } from "./tray";

const HOTKEY_RETRY_MS = 3000;

const platform = createPlatform();
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

async function start(): Promise<void> {
  const dataDir = app.getPath("userData");
  await mkdir(dataDir, { recursive: true });
  const history = new JsonHistoryStore(join(dataDir, "history.json"));
  const dictionary = new JsonDictionaryStore(join(dataDir, "dictionary.json"));

  ipcMain.handle(
    IPC.appInfo,
    (): AppInfo => ({ version: app.getVersion(), hotkeys: platform.hotkey.defaultBindings() }),
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
  const dictation = new DictationController(pill, mic, async (clip, mode) => {
    // Speech-to-text is not connected yet, so every recording is saved to history without text.
    const audioPath = await saveRecording(clip);
    const audioMs = Math.round((clip.samples.length / clip.sampleRate) * 1000);
    const record: SessionRecord = {
      id: randomUUID(),
      createdAt: Date.now(),
      mode,
      context: await platform.context.current().catch(() => ({})),
      rawText: "",
      finalText: "",
      audioPath,
      audioMs,
      timings: { sttMs: 0, rulesMs: 0, llmMs: 0, insertMs: 0, totalMs: 0 },
    };
    await history.save(record);
    notifyHistoryChanged();
    return `Saved ${(audioMs / 1000).toFixed(1)}s`;
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

  const registerHotkey = () =>
    platform.hotkey
      .register(platform.hotkey.defaultBindings(), (event) => dictation.handleHotkey(event))
      .catch((error: unknown) => {
        // Missing permission: keep trying, so the hotkey starts working as soon as it is granted.
        if (error instanceof SubxError && error.code === "permission_denied") {
          setTimeout(registerHotkey, HOTKEY_RETRY_MS);
        } else {
          console.error("Hotkey unavailable:", error);
        }
      });
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
