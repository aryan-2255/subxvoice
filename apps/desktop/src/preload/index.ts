import { contextBridge, type IpcRendererEvent, ipcRenderer } from "electron";
import { IPC, type SubxApi } from "../shared/ipc";

function subscribe<T>(channel: string, listener: (value: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, value: T) => listener(value);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api: SubxApi = {
  os: process.platform === "win32" ? "win" : "mac",
  app: {
    info: () => ipcRenderer.invoke(IPC.appInfo),
    openRecordingsFolder: () => ipcRenderer.invoke(IPC.openRecordingsFolder),
  },
  permissions: {
    list: () => ipcRenderer.invoke(IPC.permissionList),
    request: (kind) => ipcRenderer.invoke(IPC.permissionRequest, kind),
    openSettings: (kind) => ipcRenderer.invoke(IPC.permissionOpenSettings, kind),
  },
  history: {
    list: () => ipcRenderer.invoke(IPC.historyList),
    audio: (id) => ipcRenderer.invoke(IPC.historyAudio, id),
    remove: (id) => ipcRenderer.invoke(IPC.historyRemove, id),
    onChanged: (listener) => subscribe(IPC.historyChanged, listener),
  },
  dictionary: {
    list: () => ipcRenderer.invoke(IPC.dictionaryList),
    upsert: (entry) => ipcRenderer.invoke(IPC.dictionaryUpsert, entry),
    remove: (word) => ipcRenderer.invoke(IPC.dictionaryRemove, word),
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.settingsGet),
    set: (settings) => ipcRenderer.invoke(IPC.settingsSet, settings),
    onChanged: (listener) => subscribe(IPC.settingsChanged, listener),
    publishMicrophones: (options) => ipcRenderer.send(IPC.microphonePublish, options),
    microphones: () => ipcRenderer.invoke(IPC.microphoneList),
  },
  pill: {
    onState: (listener) => subscribe(IPC.pillState, listener),
    onLevel: (listener) => subscribe(IPC.pillLevel, listener),
    onMicCommand: (listener) => subscribe(IPC.micCommand, listener),
    hover: (inside) => ipcRenderer.send(IPC.pillHover, inside),
    click: () => ipcRenderer.send(IPC.pillClick),
    sendChunk: (samples) => ipcRenderer.send(IPC.micChunk, samples),
    micStopped: () => ipcRenderer.send(IPC.micStopped),
    micError: (message) => ipcRenderer.send(IPC.micError, message),
  },
};

contextBridge.exposeInMainWorld("subx", api);
