import { join } from "node:path";
import type { BrowserWindow } from "electron";

export const PRELOAD_PATH = join(__dirname, "../preload/index.js");

/** Loads a renderer page from the Vite dev server in development, or from disk in a build. */
export function loadPage(window: BrowserWindow, page: "index.html" | "pill.html"): void {
  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(`${process.env.ELECTRON_RENDERER_URL}/${page}`);
  } else {
    window.loadFile(join(__dirname, "../renderer", page));
  }
}
