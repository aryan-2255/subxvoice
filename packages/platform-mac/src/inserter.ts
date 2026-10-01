import { notImplemented, type TextInserter } from "@subx/core";

// Plan: save clipboard → write text → Cmd+V posted by the Swift helper (CGEvent) → restore
// clipboard. Needs the Accessibility permission to send the key press.
export class MacInserter implements TextInserter {
  async insert(): Promise<void> {
    throw notImplemented("mac text insert");
  }
}
