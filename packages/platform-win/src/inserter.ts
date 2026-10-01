import { SubxError, type TextInserter } from "@subx/core";
import { clipboard } from "electron";
import { restoreClipboardLater, snapshotClipboard } from "./clipboard";
import { sendChord, VK, waitForModifiersUp } from "./win32";

/**
 * Clipboard + Ctrl+V, with the user's clipboard put back afterwards.
 *
 * Cannot paste into windows running as administrator — Windows blocks synthetic input from a
 * lower-integrity process (UIPI), and there is no way around it short of elevating the whole app.
 */
export class WinInserter implements TextInserter {
  async insert(text: string): Promise<void> {
    if (!text) return;
    // Electron's clipboard is promise-based since v44, so both of these must be awaited —
    // pasting before the write lands would paste whatever was there before. The snapshot keeps
    // every format, so an image the user had copied survives the paste.
    const previous = await snapshotClipboard();
    await clipboard.writeText(text);

    // The user is usually still letting go of the hotkey; pasting now would send Win+V.
    await waitForModifiersUp();
    if (!sendChord([VK.control], VK.v)) {
      throw new SubxError("provider", "Windows refused the paste (is the target app elevated?)");
    }

    restoreClipboardLater(previous, text);
  }
}
