import { ClipboardItem, clipboard } from "electron";

/** Long enough for the target app to read the clipboard before the user's contents go back. */
const RESTORE_DELAY_MS = 400;

/**
 * Copies every format on the clipboard (text, images, files…) right now. Items from
 * `clipboard.read()` are lazy, so they are read eagerly — after we overwrite the clipboard they
 * would otherwise return our text instead of the user's.
 */
export async function snapshotClipboard(): Promise<ClipboardItem[]> {
  const items = await clipboard.read();
  return Promise.all(
    items.map(async (item) => {
      const data: Record<string, Blob> = {};
      for (const type of item.types) {
        try {
          const value = await item.getType(type);
          if (value instanceof Blob) data[type] = value;
        } catch {
          // Some platform formats can't be read back; skip them.
        }
      }
      return new ClipboardItem(data);
    }),
  );
}

/** Puts the user's clipboard back after a paste — unless something else has replaced it meanwhile. */
export function restoreClipboardLater(snapshot: ClipboardItem[], pasted: string): void {
  setTimeout(() => {
    void (async () => {
      if ((await clipboard.readText()) !== pasted) return;
      if (snapshot.length > 0) await clipboard.write(snapshot);
      else clipboard.clear();
    })();
  }, RESTORE_DELAY_MS);
}
