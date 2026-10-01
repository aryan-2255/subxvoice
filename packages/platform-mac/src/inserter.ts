import { SubxError, type TextInserter } from "@subx/core";
import { clipboard } from "electron";
import { restoreClipboardLater, snapshotClipboard } from "./clipboard";
import type { HelperMessage, MacHelper } from "./helper";

/**
 * Clipboard + ⌘V (posted by the Swift helper), with the user's clipboard put back afterwards.
 * Needs the Accessibility permission to send the key press.
 */
export class MacInserter implements TextInserter {
  private readonly helper: MacHelper;

  constructor(helper: MacHelper) {
    this.helper = helper;
  }

  async insert(text: string): Promise<void> {
    if (!text) return;
    const previous = await snapshotClipboard();
    await clipboard.writeText(text);

    const reply = await this.helper.request(
      { cmd: "paste" },
      (message): message is Extract<HelperMessage, { type: "pasted" | "error" }> =>
        message.type === "pasted" || (message.type === "error" && message.code === "paste_failed"),
    );
    // If pasting failed, leave the text on the clipboard so the user can paste it by hand.
    if (reply.type === "error") throw new SubxError("permission_denied", reply.message);
    restoreClipboardLater(previous, text);
  }
}
