# packages/platform-win — Windows plug

Implements the `Platform` interface from `@subx/core` for Windows. Owned by the Windows teammate; the full
setup and task list is in [`docs/WINDOWS.md`](../../docs/WINDOWS.md).

File names mirror `platform-mac` exactly (hotkey, inserter, permissions, context, desktop) — open the Mac
file of the same name before writing the Windows one.

| File | Status | Plan |
|---|---|---|
| `permissions.ts` | Done | Microphone only |
| `desktop.ts` | `openUrl` done | `openApp`: Start Menu shortcut + `shell.openPath` |
| `hotkey.ts` | Stub | uiohook-napi, hold Ctrl + Win, any other key cancels |
| `inserter.ts` | Stub | Clipboard + Ctrl+V via `uIOhook.keyTap`, restore the clipboard |
| `context.ts` | Stub | get-windows: app name, window title, browser URL |
| (microphone) | Not needed yet | The desktop app falls back to Web Audio when `microphone` is unset |

- Only this package (and `apps/desktop/src/renderer/src/platform/win`) may contain Windows-specific code.
- Unfinished parts throw `notImplemented(...)`; replace the throw, keep the class name.
- If "Let desktop apps access your microphone" is off, recording silently returns empty audio — always
  check `permissions.status("microphone")`.
- Windows running as administrator cannot receive our key presses (UIPI). Tell the user; do not retry.
- Native modules (uiohook-napi) go in `dependencies` of this package **and** `apps/desktop`, and under
  `allowBuilds` in `pnpm-workspace.yaml`.
- A C# helper (`native/win-helper`) is only for things Node can't do; it must speak the Mac helper's
  JSON-lines protocol (see `docs/architecture.md` → Mac helper).
