# packages/platform-mac — macOS plug

Implements the `Platform` interface from `@subx/core` for macOS. File names mirror `platform-win`
exactly (hotkey, inserter, permissions, context, desktop) — look at the other side when unsure.

- Only this package (and `apps/desktop/src/renderer/src/platform/mac`) may contain macOS-specific code.
- Unfinished parts throw `notImplemented(...)`; replace the throw, keep the class name.
- Permissions: Microphone (prompt), Accessibility and Input Monitoring (user toggles them in
  System Settings). macOS ties permissions to the code signature — unsigned dev builds may lose them
  after a rebuild.
- Hotkey, microphone, paste (⌘V) and the Input Monitoring check go through the Swift helper
  (`native/mac-helper`, wrapped by `src/helper.ts`): one process, JSON lines over stdin/stdout.
  Rebuild it with `native/mac-helper/build.sh` after changing Swift code (`pnpm dev:desktop` does it).
- Default hotkey is fn (🌐), like Wispr Flow and Willow. It needs Input Monitoring.
- The mic is on only between `mic_start` and `mic_stop` (~100 ms to start) — never keep it open.
- Paste: `inserter.ts` snapshots the whole clipboard (`clipboard.ts`, identical in `platform-win`), writes
  the text, asks the helper to send ⌘V once every modifier is physically up, then restores the clipboard.
  If Accessibility is missing the text stays on the clipboard and the error says so.
- Debug the helper with `SUBX_HELPER_DEBUG=1` (prints modifier events to stderr; ordinary keys are never
  identified).
- Scripts can't reliably fake key presses (synthetic events behave differently); test hotkeys by hand.
