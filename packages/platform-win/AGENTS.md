# packages/platform-win — Windows plug

Implements the `Platform` interface from `@subx/core` for Windows. File names mirror `platform-mac`
exactly (hotkey, inserter, permissions, context, desktop) — look at the other side when unsure.

- Only this package (and `apps/desktop/src/renderer/src/platform/win`) may contain Windows-specific code.
- Unfinished parts throw `notImplemented(...)`; replace the throw, keep the class name.
- Only the Microphone permission exists. If "Let desktop apps access your microphone" is off,
  recording silently returns empty audio — always check `permissions.status("microphone")`.
- Windows running as administrator cannot receive our key presses (UIPI). Tell the user; do not retry.
- Reading focused text needs the C# helper (`native/win-helper`, planned).
