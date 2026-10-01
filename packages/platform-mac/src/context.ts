import { type AppContext, type ContextReader, notImplemented } from "@subx/core";

// Plan: get-windows for app name, window title and browser URL. Selected text needs the
// Swift helper (Accessibility API).
export class MacContextReader implements ContextReader {
  async current(): Promise<AppContext> {
    throw notImplemented("mac context");
  }
}
