import { BrowserWindow, screen, type WebContents } from "electron";
import { IPC, type MicCommand, type PillState } from "../shared/ipc";
import { loadPage, PRELOAD_PATH } from "./renderer";

const WIDTH = 240;
const HEIGHT = 64;
const BOTTOM_GAP = 8;

/**
 * The small indicator that is always on screen. It never takes focus, so the user's app keeps the
 * cursor and the paste lands in the right place. The window ignores the mouse except while the
 * pointer is over the pill itself, so the transparent area around it never blocks clicks.
 */
export class PillWindow {
  private readonly window: BrowserWindow;

  constructor() {
    this.window = new BrowserWindow({
      width: WIDTH,
      height: HEIGHT,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      hasShadow: false,
      skipTaskbar: true,
      focusable: false,
      alwaysOnTop: true,
      fullscreenable: false,
      acceptFirstMouse: true,
      // A non-activating panel on macOS: showing it never steals focus.
      ...(process.platform === "darwin" ? { type: "panel" } : {}),
      webPreferences: {
        preload: PRELOAD_PATH,
        sandbox: true,
        contextIsolation: true,
        // Keep audio and timers running while the window is not focused.
        backgroundThrottling: false,
      },
    });
    this.window.setAlwaysOnTop(true, "screen-saver");
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.setHover(false);
    this.window.once("ready-to-show", () => {
      this.moveToCursorScreen();
      this.window.showInactive();
    });
    loadPage(this.window, "pill.html");
  }

  /** Bottom-centre of whichever screen the mouse is on. */
  moveToCursorScreen(): void {
    const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    this.window.setPosition(
      Math.round(workArea.x + (workArea.width - WIDTH) / 2),
      Math.round(workArea.y + workArea.height - HEIGHT - BOTTOM_GAP),
    );
  }

  /** While the pointer is over the pill, accept clicks; otherwise let them pass through. */
  setHover(inside: boolean): void {
    this.window.setIgnoreMouseEvents(!inside, { forward: true });
  }

  setState(state: PillState): void {
    this.window.webContents.send(IPC.pillState, state);
  }

  /** Loudness (0–1) of the latest chunk, for the waveform. */
  level(value: number): void {
    this.window.webContents.send(IPC.pillLevel, value);
  }

  mic(command: MicCommand): void {
    this.window.webContents.send(IPC.micCommand, command);
  }

  owns(sender: WebContents): boolean {
    return sender === this.window.webContents;
  }
}
