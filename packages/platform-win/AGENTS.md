# packages/platform-win — Windows plug

Implements the `Platform` interface from `@subx/core` for Windows. Owned by the Windows teammate; the full
setup and task list is in [`docs/WINDOWS.md`](../../docs/WINDOWS.md).

File names mirror `platform-mac` exactly (hotkey, inserter, permissions, context, desktop) — open the Mac
file of the same name before writing the Windows one.

| File | Status | How |
|---|---|---|
| `permissions.ts` | Done | Microphone only |
| `hotkey.ts` | Done | Polls real key state every 15 ms (`GetAsyncKeyState` via koffi), default Ctrl + Win; any other key cancels |
| `inserter.ts` | Done | Clipboard snapshot → Ctrl+V via `SendInput` → user's clipboard restored |
| `win32.ts` | Done | The few Win32 calls, through koffi. `user32.dll` is loaded on first use |
| `clipboard.ts` | Done | Same file as in `platform-mac` — keep them identical |
| `desktop.ts` | `openUrl` done | `openApp`: Start Menu shortcut + `shell.openPath` |
| `context.ts` | Stub | get-windows: app name, window title, browser URL |
| (microphone) | Not needed | The desktop app records through Web Audio when `microphone` is unset |

- Only this package (and `apps/desktop/src/renderer/src/platform/win`) may contain Windows-specific code.
- Unfinished parts throw `notImplemented(...)`; replace the throw, keep the class name.
- If "Let desktop apps access your microphone" is off, recording silently returns empty audio — always
  check `permissions.status("microphone")`.
- Windows running as administrator cannot receive our key presses (UIPI). Tell the user; do not retry.
- koffi is a native module: it is in `dependencies` of this package **and** `apps/desktop`, `external` in
  `electron.vite.config.ts`, unpacked in `electron-builder.yml`, and allowed under `allowBuilds`.
- This package is imported on macOS too. Never call `koffi.load` (or any Windows API) at import time.
- A C# helper (`native/win-helper`) is only for things Node can't do; it must speak the Mac helper's
  JSON-lines protocol (see `docs/architecture.md` → Mac helper).
