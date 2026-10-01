# Windows Guide — start here

This guide is for the Windows owner of SUBXVoice and for the AI coding agent they use. Read it fully,
then read [`AGENTS.md`](../AGENTS.md) (repo map and rules) before writing code.

## The setup

- **SUBXVoice** is a voice-typing desktop app: hold a hotkey, speak (any language, switching mid-sentence
  is fine), and clean text is pasted at the cursor in any app. Product details: [FEATURES.md](FEATURES.md).
- **Aryan builds the macOS side. You build the Windows side.** Both of you share the core, the UI and
  everything else.
- The app is **one codebase** (Electron + TypeScript). Everything that differs between operating systems
  sits behind interfaces in `packages/core/src/contracts/platform.ts`. Aryan implements them in
  `packages/platform-mac`; **you implement them in `packages/platform-win`**. The rest of the app
  doesn't know or care which OS it runs on.
- The Mac side is ahead. When unsure how to do something, open the same file in `platform-mac` — the file
  names are mirrored on purpose.

## What you own, and what you don't

| Path | Rule |
|---|---|
| `packages/platform-win/` | Yours. |
| `apps/desktop/src/renderer/src/platform/win/` | Yours (Windows-only UI bits). |
| `native/win-helper/` | Yours, if you ever need a native helper (see the last task). |
| `packages/platform-mac/`, `native/mac-helper/`, `renderer/src/platform/mac/` | Aryan's. Don't change. |
| `packages/core/src/contracts/` | Shared. Changing an interface breaks the Mac side too — discuss first. |
| Everything else (core logic, shared UI, website, docs) | Shared. Normal PRs, the other person reviews. |

## Setup (once)

1. **Fork** `https://github.com/aryan-2255/subxvoice` on GitHub, then clone your fork:
   ```powershell
   git clone https://github.com/<your-username>/subxvoice.git
   cd subxvoice
   git remote add upstream https://github.com/aryan-2255/subxvoice.git
   ```
2. Install **Git**, **Node.js 24 LTS** and **pnpm 11** (`corepack enable` then `corepack prepare pnpm@11.1.2 --activate`).
3. Install and check:
   ```powershell
   pnpm install
   pnpm check        # lint + typecheck + tests; must pass before every PR
   pnpm dev:desktop  # runs the Electron app
   ```
4. Send Aryan your GitHub username so it can replace `FRIEND_GITHUB_USERNAME` in `.github/CODEOWNERS`.

Line endings are forced to LF by `.gitattributes`, so Windows checkouts pass the formatter. If your editor
asks, keep LF.

## How a dictation works

```
hotkey (platform) → mic → 16 kHz audio chunks → [STT → rules → paste]  → history + pill states
```

- `apps/desktop/src/main/index.ts` wires everything; `src/main/dictation.ts` runs one dictation.
- The **pill** is the small always-on-screen indicator; the **tray icon** opens the dashboard or quits.
- The **dashboard** (Home, History, Dictionary, Settings) is shared React UI.
- Recordings and history are saved locally (`%APPDATA%\@subx\desktop\` in development).

## What works on Windows today

| Piece | File | Windows status |
|---|---|---|
| Hotkey (hold Ctrl + Win, or another combo from Settings) | `platform-win/src/hotkey.ts` | ✅ Done — polls real key state, see `win32.ts` |
| Paste text at the cursor | `platform-win/src/inserter.ts` | ✅ Done — Ctrl+V via `SendInput`, clipboard restored |
| Microphone | Web Audio fallback in the pill (`renderer/src/pill/recorder.ts`) | ✅ Works, with a mic picker in Settings |
| Speech-to-text + Roman script | shared (`packages/providers`) | ✅ Works with keys in `.env` |
| Dashboard, pill, tray, history, dictionary, settings | `apps/desktop` (shared) | ✅ |
| Permissions | `platform-win/src/permissions.ts` | ✅ Microphone only |
| Open URL | `platform-win/src/desktop.ts` | ✅ |
| Active app / window | `platform-win/src/context.ts` | ⏳ Stub — next task |
| Open app by name | `platform-win/src/desktop.ts` | ⏳ Stub |
| Installer | `pnpm --filter @subx/desktop dist:win` | ⏳ Not tried yet |

## Your tasks, in order

Do them one per PR. Each one has a "done when" check.

### Done
- **Hotkey** — polling `GetAsyncKeyState` every 15 ms through koffi instead of a keyboard hook (a slow
  hook is silently removed by Windows). Hold the combo to talk; any other key cancels.
- **Paste** — clipboard snapshot (every format, so a copied image survives) → Ctrl+V once the user has let
  go of every modifier → clipboard restored. Can't paste into apps running as administrator (UIPI).

### 1. Active app — `context.ts`
Return `{ appName, windowTitle, url }` for the focused window, e.g. with
[`get-windows`](https://www.npmjs.com/package/get-windows) or Win32 calls in `win32.ts`. Every field is
optional. It is passed to the LLM so the tone matches the app (Slack vs. Gmail) and shown in History.
**Done when** History shows "in <app name>" under a new dictation.

### 2. Open app by name — `desktop.ts`
`openApp(name)`: find the Start Menu shortcut and `shell.openPath` it.

### 3. Windows look and feel
`renderer/src/platform/win/Chrome.tsx` holds the Windows-only UI pieces (sidebar top, permission text,
hotkey/mic notes). Optional polish: `titleBarOverlay` / Mica in `src/main/index.ts` behind
`platform.os === "win"`.

### 4. Installer
`pnpm --filter @subx/desktop dist:win` builds `SUBXVoice-windows-setup.exe` (NSIS). Check that koffi
ends up unpacked inside the installed app and the hotkey works from the installed copy. Code signing
comes later.

### Later — native helper (only if needed)
For things Node can't do well (reading the focused text field, detecting the user's edits, a faster mic),
build `native/win-helper` in C#. Make it speak **the same protocol as the Mac helper** — one JSON object
per line over stdin/stdout, see `native/mac-helper/Sources/main.swift` and
`packages/platform-mac/src/helper.ts` — so the TypeScript side can mirror `platform-mac`.

### Rules learned the hard way
- `platform-win` is imported on macOS too. Never load `user32.dll` (or call any Windows API) at import
  time — load it on first use. A top-level `koffi.load` crashed the Mac app on startup.
- `clipboard.ts` exists in both platform packages and must stay identical.
- Run `pnpm check` before pushing; CI runs on both OSes and must be green.

## Environment variables and API keys

- Copy `.env.example` to `.env` at the repo root and fill in `SONIOX_API_KEY` (speech-to-text) and
  `OPENROUTER_API_KEY` (Roman script / rewriting). Restart the app after changing it; Settings → Engines
  shows whether each one is ready. Without keys the app still records and saves audio.
- Only `apps/desktop/src/main/providers.ts` reads `.env`, and only when the app is **not packaged**.
  Providers never read `process.env` themselves.
- In production, vendor keys live **only on our backend** (`apps/api`, not built yet) and the app gets
  short-lived tokens. Keys must never ship inside the app.
- Never use the `VITE_`, `MAIN_VITE_` or `RENDERER_VITE_` prefixes for keys — electron-vite bakes those
  into the build. Never commit `.env` (it is git-ignored; only `.env.example` is committed).

## Testing tips

- `pnpm check` before every PR. CI runs it on both macOS and Windows; both must be green.
- Faking key presses from a script is unreliable — test hotkeys by hand.
- DevTools for the dashboard: `Ctrl+Shift+I`. To inspect the pill, start with
  `pnpm --filter @subx/desktop exec electron-vite dev --remoteDebuggingPort 9333` and open
  `http://127.0.0.1:9333/json`.

## Workflow

```powershell
git fetch upstream
git checkout -b win/hotkey upstream/main
# ...work, then
pnpm check
git push origin win/hotkey
# open a Pull Request from your fork to aryan-2255/subxvoice:main
```

Keep your fork current with `git fetch upstream && git rebase upstream/main`. Small PRs, one task each.
Write down any decision you make (picking one library over another, etc.) in
[`docs/decisions.md`](decisions.md).

## For your AI agent

Paste this as the first message:

> You are working on SUBXVoice. I own the Windows side; Aryan owns macOS. Read `docs/WINDOWS.md`, then
> `AGENTS.md`, `docs/architecture.md` and the `AGENTS.md` inside every folder you touch. Only change
> Windows files unless I say otherwise, mirror the matching `platform-mac` file, and run `pnpm check`
> before you say a task is done. Start with task 0 in `docs/WINDOWS.md`.
