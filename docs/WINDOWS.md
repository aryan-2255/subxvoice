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

> **The app has never been run on a Windows machine.** CI type-checks, tests and builds it on Windows on
> every push, but nobody has opened it there yet. Expect small runtime fixes.

| Piece | File | Windows status |
|---|---|---|
| Dashboard, pill, tray, history, dictionary | `apps/desktop` (shared) | Should work — untested |
| Microphone | Web Audio fallback in the pill (`renderer/src/pill/recorder.ts`) | Should work. `Platform.microphone` is not set on Windows, so this fallback is used automatically |
| Permissions | `platform-win/src/permissions.ts` | Done (microphone only) |
| Open URL | `platform-win/src/desktop.ts` | Done |
| Hotkey | `platform-win/src/hotkey.ts` | **Stub — your first real task** |
| Paste text | `platform-win/src/inserter.ts` | Stub (also not done on Mac yet) |
| Active app / window | `platform-win/src/context.ts` | Stub |
| Open app by name | `platform-win/src/desktop.ts` | Stub |
| Speech-to-text, LLM, backend | shared | Not built yet, for both OSes |

## Your tasks, in order

Do them one per PR. Each one has a "done when" check.

### 0. Run it on Windows
Run `pnpm dev:desktop` and fix whatever breaks. Check: dashboard opens, the pill shows at the bottom of
the screen, the tray icon is visible (it's drawn white for dark taskbars in `apps/desktop/src/main/tray.ts`),
**Quit SUBXVoice** in the tray menu quits.
**Done when** the app runs and all four dashboard pages open without errors.

### 1. Hotkey — hold Ctrl + Win to talk
File: `packages/platform-win/src/hotkey.ts`. Read `packages/platform-mac/src/hotkey.ts` first — same
behaviour, different key source.

- Use [`uiohook-napi`](https://www.npmjs.com/package/uiohook-napi) (global keydown/keyup; no permission
  needed on Windows). Default binding stays `ctrl+win` (`defaultBindings()` already returns it).
- `pressed` when both Ctrl and Win are down; `released` when either goes up; `cancel` when any other key
  is pressed while they are held (so the user's own Ctrl+Win shortcuts still work).
- Keycodes: `UiohookKey.Ctrl`/`CtrlRight` and `UiohookKey.Meta`/`MetaRight`.
- It is a native module, so: add it to `packages/platform-win` **and** to `apps/desktop` `"dependencies"`
  (not devDependencies — electron-vite must not bundle it), and add `uiohook-napi: true` under
  `allowBuilds` in `pnpm-workspace.yaml`.
- Windows can't send our keys to apps running as administrator (UIPI). Don't retry; that's expected.

**Done when** holding Ctrl+Win shows the waveform in the pill, releasing saves a recording that appears in
History, and pressing a letter while holding Ctrl+Win cancels instead of recording.

### 2. Microphone
Nothing to build: the Web Audio fallback is used automatically. It keeps the mic open for a minute after
each dictation (Chromium needs ~300 ms to open it, which would cut the first word).
**Done when** History playback (▶) plays your actual voice.

### 3. Paste — `inserter.ts`
Save the clipboard → write the text → send Ctrl+V (`uIOhook.keyTap(UiohookKey.V, [UiohookKey.Ctrl])`) →
restore the clipboard after ~150 ms. The Mac version isn't built yet either — agree on the approach with
Aryan so both behave the same. It only becomes visible once speech-to-text exists.

### 4. Active app — `context.ts`
Return `{ appName, windowTitle, url }` for the focused window, e.g. with
[`get-windows`](https://www.npmjs.com/package/get-windows). Return what you can; every field is optional.

### 5. Open app by name — `desktop.ts`
`openApp(name)`: find the Start Menu shortcut and `shell.openPath` it.

### 6. Windows look and feel
`renderer/src/platform/win/Chrome.tsx` holds the Windows-only UI pieces (sidebar top, permission text,
hotkey/mic notes). Optional polish: `titleBarOverlay` / Mica in `src/main/index.ts` behind
`platform.os === "win"`.

### 7. Installer
`pnpm --filter @subx/desktop dist:win` builds `SUBXVoice-windows-setup.exe` (NSIS). Check that
`uiohook-napi` ends up inside the installed app. If it doesn't, try `node-linker=hoisted` in a root
`.npmrc`. Code signing comes later.

### Later — native helper (only if needed)
For things Node can't do well (reading the focused text field, detecting the user's edits, a faster mic),
build `native/win-helper` in C#. Make it speak **the same protocol as the Mac helper** — one JSON object
per line over stdin/stdout, see `native/mac-helper/Sources/main.swift` and
`packages/platform-mac/src/helper.ts` — so the TypeScript side can mirror `platform-mac`.

## Environment variables and API keys

- **Nothing needs a `.env` today.** Speech-to-text and LLM providers aren't connected yet.
- The plan: vendor API keys live **only on our backend** (`apps/api`, not built yet); the app gets
  short-lived tokens. Keys must never ship inside the app.
- Until the backend exists, local experiments may read a key from `process.env` **in the main process
  only, and only when `!app.isPackaged`**. Keep it in a git-ignored `.env.local` or your shell.
  Never use the `VITE_`, `MAIN_VITE_` or `RENDERER_VITE_` prefixes — electron-vite bakes those into the
  build. Never commit a key (`.env*` is git-ignored; only `.env.example` may be committed).

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
