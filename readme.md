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
| Hold hotkey → record | ✅ fn (🌐), via the Swift helper | ⏳ Ctrl + Win planned (stub) |
| Microphone | ✅ native, on only while the key is held | ✅ Web Audio fallback (untested on a real PC) |
| Always-on-screen pill with live waveform | ✅ | ✅ shared (untested) |
| Dashboard: Home stats, History with playback, Dictionary, Settings | ✅ | ✅ shared (untested) |
| Menu bar / tray icon (open, quit) | ✅ | ✅ shared (untested) |
| Permissions screen | ✅ mic, Accessibility, Input Monitoring | ✅ mic |
| Recordings + history saved locally | ✅ WAV + JSON files | ✅ shared |
| Speech-to-text → text pasted at the cursor | ⏳ next | ⏳ |
| Style mode (LLM rewrite), voice commands, MCP | ⏳ | ⏳ |
| Backend: login, sync, stats, teams | ⏳ | ⏳ |
| Installers, signing, auto-update | ⏳ config only | ⏳ config only |
| Website with Mac / Windows download buttons | ✅ | ✅ |

The core pipeline (dictionary rules, router, style-mode prompt) is built and unit-tested, waiting for a
speech-to-text provider.

## Docs

- [Agent guide](AGENTS.md) — repo map, rules, how-tos; also the best overview for humans
- [Windows guide](docs/WINDOWS.md) — setup, ownership and the task list for the Windows side
- [Features](docs/FEATURES.md) — the full product feature list
- [Architecture](docs/architecture.md) — how the pieces fit together
- [Tech stack](docs/TECH_STACK.md)
- [Decisions](docs/decisions.md) — why things are the way they are
