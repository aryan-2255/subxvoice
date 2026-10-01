import { notImplemented, type TextInserter } from "@subx/core";

// Plan: save clipboard → write text → send Ctrl+V (nut-js) → restore clipboard.
// Cannot paste into windows running as administrator (Windows UIPI rule).
export class WinInserter implements TextInserter {
  async insert(): Promise<void> {
    throw notImplemented("windows text insert");
  }
}
