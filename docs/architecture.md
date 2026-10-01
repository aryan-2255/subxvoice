# Architecture

## The one idea

**Core is a switchboard with sockets. Everything else is a plug.**

`packages/core` defines interfaces (the sockets) and the pipeline that uses them. Vendors, operating
systems, databases and MCP servers are plugs that implement those interfaces. Swapping Deepgram for our
own model, or Mac for Windows, never changes core.

## Dictation pipeline

```
Hotkey ──► Mic ──► STT ──► Rules ──► Router ──┬─► exact ──────────────────► Inserter ──► cursor
                                              ├─► style ──► LLM ──────────► Inserter
                                              └─► command ──► Tools (built-in / OS / MCP)

Every dictation is saved to local history: audio, text, app and per-stage timings.
```

| Stage | Where | Notes |
|---|---|---|
| Hotkey | `Platform.hotkey` | Hold = talk. One binding per mode (exact / style). Mac: fn via the Swift helper. |
| Mic | `Platform.microphone`, else Web Audio | Mac: Swift helper (AVAudioEngine), on only while held, ~100 ms to start. Without a native mic the pill records through Web Audio and keeps the mic warm for a minute (~300 ms to open). |
| STT | `SttProvider` plug | Dictionary words go in as hints. Never force one language. |
| Rules | `core/rules.ts` | Dictionary corrections + spacing. Deterministic, ~1 ms, no AI. |
| Router | `core/router.ts` | Trigger phrase at the start → command. Otherwise dictation. |
| Style rewrite | `LlmProvider` plug | Only in style mode. Prompt in `core/prompts.ts`. |
| Insert | `Platform.inserter` | Clipboard + Cmd/Ctrl+V, clipboard restored afterwards. |
| History | `HistoryStore` plug | Local JSON file + WAV recordings today (`apps/desktop/src/main/stores.ts`); SQLite later. Timings per stage are recorded. |

## Plug points

| Interface | File | Plugs today | Later |
|---|---|---|---|
| `SttProvider` | `contracts/stt.ts` | fake | Deepgram / Groq / Soniox…, local whisper.cpp, our own model |
| `LlmProvider` | `contracts/llm.ts` | fake | Claude Haiku / Groq, our own model |
| `Platform` (hotkey, microphone, inserter, permissions, context, desktop) | `contracts/platform.ts` | `platform-mac`: hotkey, mic, permissions via the Swift helper. `platform-win`: permissions, open URL; the rest are stubs | Paste, active-app context, focused text; C# helper on Windows if needed |
| `Tool` + `ToolRegistry` | `contracts/tool.ts`, `tools.ts` | — | built-in commands, OS actions, MCP tools |
| `HistoryStore`, `DictionaryStore` | `contracts/store.ts` | JSON files (`apps/desktop/src/main/stores.ts`), in-memory fakes for tests | SQLite (local), synced dictionary |

## Actions and MCP

Everything SUBXVoice can *do* is a `Tool` in one `ToolRegistry`:

```
ToolRegistry
├── built-in   draft_email, rewrite, translate…
├── platform   open_app, open_url           (from Platform.desktop)
└── mcp        every tool of every MCP server the user connects
```

For a command, the LLM receives `registry.list()` and picks a tool. Tools marked `risk: "confirm"`
(send, delete, post, buy) always ask the user first. Connecting an MCP server only adds tools to the
registry — core does not change.

SUBXVoice will also run its own MCP **server**, so other assistants can read (with permission) the
user's history and dictionary.

## Desktop app processes

| Process | Folder | Can do |
|---|---|---|
| Main (Node) | `apps/desktop/src/main` | Everything: platform plug, pipeline, files, network, MCP |
| Preload | `apps/desktop/src/preload` | Exposes `window.subx` (typed in `src/shared/ipc.ts`) |
| Renderer (React) | `apps/desktop/src/renderer` | UI only; talks to main through `window.subx` |

Windows (app windows, not the OS):

| Window | Status |
|---|---|
| Main window — dashboard with Home, History, Dictionary, Settings | Built. Created on open, destroyed on close to keep background RAM low |
| Recording pill — bottom centre of the screen, live waveform, click opens the dashboard | Built. **Never takes focus** (or the paste would land in the wrong app); ignores the mouse except over the pill |
| Tray / menu bar icon — Open, Quit | Built. The app keeps running after the dashboard closes; quit from here |
| Command popup ("What should the email be about?") | Planned, also non-focusing |

## Mac helper

`native/mac-helper` is a small Swift program the app starts once (`packages/platform-mac/src/helper.ts`).
It does what Electron can't do well on macOS: detect the fn key (listen-only event tap, needs Input
Monitoring), record the mic natively, and read the Input Monitoring permission. Protocol: one JSON
object per line — commands on stdin (`watch`, `mic_start`, `mic_stop`, `permissions`, `request`), events
on stdout (`key`, `audio`, `mic_started`, `mic_stopped`, `permissions`, `error`). It never reports which
ordinary key was pressed, only "other". A Windows helper, if built, should speak the same protocol.

## Where data lives

| Data | Location |
|---|---|
| Audio, transcripts, history | Device only |
| Dictionary, shortcuts, settings | Device; synced to the backend once it exists |
| Stats (numbers only) | Computed on the device today; backend later |
| Vendor API keys | Backend only; the app gets short-lived tokens |

## Releases

`electron-builder` produces `SUBXVoice-mac.dmg` (universal) and `SUBXVoice-windows-setup.exe` and
publishes them to GitHub Releases. The website links to `releases/latest/download/<file>`, so a new
release needs no website change. Mac builds must be signed and notarized; Windows builds should be
signed to avoid SmartScreen warnings.
