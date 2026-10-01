# Architecture

## The one idea

**Core is a switchboard with sockets. Everything else is a plug.**

`packages/core` defines interfaces (the sockets) and the pipeline that uses them. Vendors, operating
systems, databases and MCP servers are plugs that implement those interfaces. Swapping Deepgram for our
own model, or Mac for Windows, never changes core.

## Dictation pipeline

```
Hotkey ─► Mic (Web Audio) ─► STT ─► Rules ─► Router ─┬─► exact  ───────────────► Inserter ─► cursor
 [Platform]   [shared]      [plug]  [core]   [core]  ├─► style  ─► LLM [plug] ─► Inserter
                                                      └─► command ─► Tools (built-in / OS / MCP)
                                                                         │
                                          History + Stats (local) ◄──────┘
```

| Stage | Where | Notes |
|---|---|---|
| Hotkey | `Platform.hotkey` | Hold = talk. One binding per mode (exact / style). |
| Mic | `apps/desktop` renderer, Web Audio | Same code on both OSes, so it is not part of `Platform`. |
| STT | `SttProvider` plug | Dictionary words go in as hints. Never force one language. |
| Rules | `core/rules.ts` | Dictionary corrections + spacing. Deterministic, ~1 ms, no AI. |
| Router | `core/router.ts` | Trigger phrase at the start → command. Otherwise dictation. |
| Style rewrite | `LlmProvider` plug | Only in style mode. Prompt in `core/prompts.ts`. |
| Insert | `Platform.inserter` | Clipboard + Cmd/Ctrl+V, clipboard restored afterwards. |
| History | `HistoryStore` plug | Local SQLite + audio files. Timings per stage are recorded. |

## Plug points

| Interface | File | Plugs today | Later |
|---|---|---|---|
| `SttProvider` | `contracts/stt.ts` | fake | Deepgram / Groq / Soniox…, local whisper.cpp, our own model |
| `LlmProvider` | `contracts/llm.ts` | fake | Claude Haiku / Groq, our own model |
| `Platform` (hotkey, inserter, permissions, context, desktop) | `contracts/platform.ts` | `platform-mac`, `platform-win` (stubs + permissions) | Swift / C# helpers for Fn key and reading focused text |
| `Tool` + `ToolRegistry` | `contracts/tool.ts`, `tools.ts` | — | built-in commands, OS actions, MCP tools |
| `HistoryStore`, `DictionaryStore` | `contracts/store.ts` | in-memory fakes | SQLite (local), synced dictionary |

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

Windows planned: main window (created on open, destroyed on close), recording pill and command popup
(both **never take focus**, or the paste lands in the wrong app), onboarding, tray / menu bar icon.

## Where data lives

| Data | Location |
|---|---|
| Audio, transcripts, history | Device only |
| Dictionary, shortcuts, settings | Device, synced to the backend |
| Stats (numbers only) | Backend |
| Vendor API keys | Backend only; the app gets short-lived tokens |

## Releases

`electron-builder` produces `SUBXVoice-mac.dmg` (universal) and `SUBXVoice-windows-setup.exe` and
publishes them to GitHub Releases. The website links to `releases/latest/download/<file>`, so a new
release needs no website change. Mac builds must be signed and notarized; Windows builds should be
signed to avoid SmartScreen warnings.
