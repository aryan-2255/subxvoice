# apps/desktop — Electron app

| Folder | Runs in | Rule |
|---|---|---|
| `src/main` | Node (main process) | Owns the platform plug, pipeline, files, network, MCP |
| `src/preload` | Bridge | Only maps `window.subx` calls to IPC — no logic |
| `src/shared/ipc.ts` | Everywhere | Single source of truth for IPC channels and types |
| `src/renderer` | Browser (React) | UI only. Never import Node/Electron here |
| `src/renderer/src/shared` | UI for both OSes | Most screens go here |
| `src/renderer/src/platform/mac` · `win` | UI for one OS | Same file names + same exports in both folders |

- `@platform/*` resolves to the current OS's folder at build time (see `electron.vite.config.ts`).
- Windows that must never take focus (recording pill, command popup): `focusable: false`.
- The main window is destroyed on close, not hidden, to keep background RAM low.
- Mac permission text shown by macOS lives in `electron-builder.yml` (`extendInfo`).
- If Electron starts as plain Node, `unset ELECTRON_RUN_AS_NODE`.

## Dictation flow (today)

Hotkey (`platform.hotkey`) → `DictationController` (`src/main/dictation.ts`) → mic (`src/main/mic.ts`) →
16 kHz chunks → clip saved as WAV in `userData/recordings` + a history record (`src/main/stores.ts`).
The pill (`src/main/pill.ts` + `src/renderer/src/pill/`) shows state and the waveform (levels come from main).
STT + paste plug in at the `ClipHandler` in `src/main/index.ts`.

- Mic source: `platform.microphone` when the OS plug has one (Mac: Swift helper, on only while the key
  is held). Otherwise the Web Audio fallback in the pill (`MicRecorder`), which keeps the mic warm for
  `WARM_MS` with a 300 ms pre-roll because Chromium takes ~300 ms to open it.
- The audio worklet (`pcm-worklet.ts`) runs on the audio thread and must not import anything.
- Accidental taps are detected by hold time (`MIN_HOLD_MS`), not clip length (pre-roll makes clips longer).
- Speed target: text pasted **200–500 ms after the key is released**. Measure before and after changes.
- Read the pill and dashboard state through `--remote-debugging-port` (DevTools protocol). Hotkeys must
  be tested by hand — synthetic key events are unreliable.
