import { Menu, nativeImage, Tray } from "electron";

/** Menu bar icon (Mac) / system tray icon (Windows): the way to open the dashboard or quit. */
export function createTray(openDashboard: () => void): Tray {
  const tray = new Tray(micIcon());
  tray.setToolTip("SUBXVoice");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open SUBXVoice", click: openDashboard },
      { type: "separator" },
      { label: "Quit SUBXVoice", role: "quit" },
    ]),
  );
  return tray;
}

const SIZE = 32; // 16 pt drawn at 2x for sharp retina rendering
const SUPERSAMPLE = 4;

/** Draws a small microphone. On Mac it is a template image, so macOS tints it for light/dark menu bars. */
function micIcon() {
  const isMac = process.platform === "darwin";
  const shade = isMac ? 0 : 255;
  const buffer = Buffer.alloc(SIZE * SIZE * 4);
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      let hits = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const x = ((px + (sx + 0.5) / SUPERSAMPLE) * 16) / SIZE;
          const y = ((py + (sy + 0.5) / SUPERSAMPLE) * 16) / SIZE;
          if (insideMic(x, y)) hits++;
        }
      }
      const alpha = hits / (SUPERSAMPLE * SUPERSAMPLE);
      const offset = (py * SIZE + px) * 4;
      // BGRA, premultiplied alpha.
      buffer[offset] = shade * alpha;
      buffer[offset + 1] = shade * alpha;
      buffer[offset + 2] = shade * alpha;
      buffer[offset + 3] = 255 * alpha;
    }
  }
  const image = nativeImage.createFromBitmap(buffer, { width: SIZE, height: SIZE, scaleFactor: 2 });
  if (isMac) image.setTemplateImage(true);
  return image;
}

/** Microphone shape in a 16 × 16 grid. */
function insideMic(x: number, y: number): boolean {
  const cx = 8;
  const radius = 2.6;
  const top = 1.5 + radius;
  const bottom = 9.5 - radius;
  const body =
    (Math.abs(x - cx) <= radius && y >= top && y <= bottom) ||
    Math.hypot(x - cx, y - top) <= radius ||
    Math.hypot(x - cx, y - bottom) <= radius;
  const ring = Math.hypot(x - cx, y - 7.5);
  const holder = y >= 7.5 && ring >= 4.3 && ring <= 5.5;
  const stem = Math.abs(x - cx) <= 0.65 && y >= 12.5 && y <= 14.5;
  const base = Math.abs(x - cx) <= 3 && y >= 13.9 && y <= 15.1;
  return body || holder || stem || base;
}
