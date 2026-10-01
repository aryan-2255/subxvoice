# SUBXVoice

Typing is optional. Hold a key, speak in any language, and clean text appears wherever your cursor is —
on macOS and Windows.

## Team

| Area | Owner |
|---|---|
| macOS | Aryan |
| Windows | Aryan's teammate — **start with [docs/WINDOWS.md](docs/WINDOWS.md)** |
| Core, shared UI, website, docs | Both, via pull requests |

## Getting started

Requirements: Node 22+ (24 LTS recommended) and pnpm 11. On Mac, also Xcode or the Xcode Command Line
Tools (the Swift helper is built automatically).

```bash
pnpm install
pnpm dev:desktop   # Electron app
pnpm dev:web       # website on http://localhost:3000
pnpm check         # lint + typecheck + tests (run before every PR)
```

If the desktop app opens as plain Node inside a VS Code terminal, run `unset ELECTRON_RUN_AS_NODE`.

## What works today

| Feature | macOS | Windows |
|---|---|---|
| Hold hotkey → record | ✅ fn (🌐) by default, via the Swift helper | ✅ Ctrl + Win by default (key-state polling) |
| Microphone | ✅ native, on only while the key is held | ✅ Web Audio, with a mic picker in Settings |
| Speech-to-text, streamed while you speak | ✅ Soniox (needs `SONIOX_API_KEY`) | ✅ same |
| Text pasted at the cursor, user's clipboard restored | ✅ ⌘V via the Swift helper | ✅ Ctrl+V via Win32 `SendInput` |
| Hindi etc. written in Roman letters (Hinglish) or native script | ✅ OpenRouter (needs `OPENROUTER_API_KEY`) | ✅ same |
| Always-on-screen pill: live waveform, then the words as heard | ✅ | ✅ |
| Dashboard: Home stats, History with playback, Dictionary, Settings | ✅ | ✅ |
| Settings: hotkey picker, script, engines status | ✅ | ✅ (+ microphone picker) |
| Menu bar / tray icon (open, quit) | ✅ | ✅ |
| Recordings + history saved locally | ✅ WAV + JSON files | ✅ |
| Style mode (rewrite in your tone), voice commands, MCP | ⏳ pipeline ready, no hotkey yet | ⏳ |
| Active-app context, open apps by voice | ⏳ | ⏳ |
| Backend: login, sync, stats, teams | ⏳ | ⏳ |
| Installers, signing, auto-update | ⏳ config only | ⏳ config only |
| Website with Mac / Windows download buttons | ✅ | ✅ |

Speech-to-text and the Roman-script rewrite need API keys in development: copy `.env.example` to `.env`
at the repo root and fill it in (see "Environment variables" in [docs/WINDOWS.md](docs/WINDOWS.md)).
Without keys the app still records and saves audio.

## Docs

- [Agent guide](AGENTS.md) — repo map, rules, how-tos; also the best overview for humans
- [Windows guide](docs/WINDOWS.md) — setup, ownership and the task list for the Windows side
- [Features](docs/FEATURES.md) — the full product feature list
- [Architecture](docs/architecture.md) — how the pieces fit together
- [Tech stack](docs/TECH_STACK.md)
- [Decisions](docs/decisions.md) — why things are the way they are
