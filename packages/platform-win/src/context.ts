import { type AppContext, type ContextReader, notImplemented } from "@subx/core";

// Plan: get-windows for app name, window title and browser URL. Selected text needs the
// C# helper (UI Automation).
export class WinContextReader implements ContextReader {
  async current(): Promise<AppContext> {
    throw notImplemented("windows context");
  }
}
