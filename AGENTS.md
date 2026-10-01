# SUBXVoice — Agent Guide

SUBXVoice is a voice-typing desktop app for **macOS and Windows**: hold a hotkey, speak (any language,
switching mid-sentence is fine), and clean text is pasted at the cursor in any app. Later: voice
commands ("write a mail"), actions via MCP, history with audio replay, stats, teams.

**Start here:** [`readme.md`](readme.md) shows what works today. Working on the **Windows** side? Read
[`docs/WINDOWS.md`](docs/WINDOWS.md) first — it has the setup, what you own and the task list.
Read `docs/architecture.md` before changing anything in `packages/core`.

Team: Aryan owns macOS (`platform-mac`, `native/mac-helper`); his teammate owns Windows (`platform-win`).
Everything else is shared and changes through pull requests reviewed by the other person.

## Repo map

| Path | What | Owner |
|---|---|---|
| `packages/core` | Plug-point interfaces, pipeline, dictionary rules, router, tool registry, fakes | both |
| `packages/providers` | STT / LLM plugs — one file per vendor | both |
| `packages/platform-mac` | macOS plug: hotkey, paste, permissions, context, desktop actions | Mac owner |
| `packages/platform-win` | Windows plug — **same file names** as platform-mac | Windows owner |
| `packages/mcp` | MCP client + server (not built yet) | both |
| `packages/shared` | Code shared by desktop, web and (later) the backend | both |
| `apps/desktop` | Electron app: `src/main` (Node side), `src/preload` (bridge), `src/renderer` (React UI) | both |
| `apps/web` | Next.js website with the Mac / Windows download buttons | both |
| `native/mac-helper` | Swift helper: fn hotkey (event tap), native mic (AVAudioEngine), permission checks | Mac owner |
| `docs/` | Features, tech stack, architecture, decisions | both |

Planned, not created yet: `apps/api` (Hono backend), `native/win-helper` (C#).

## Commands (run from the repo root)

```bash
pnpm install          # once
pnpm check            # lint + format check + typecheck + tests — run after every change
pnpm fix              # auto-fix lint/format
pnpm dev:desktop      # run the Electron app
pnpm dev:web          # run the website on localhost:3000
```

`pnpm check` must pass before you say a task is done.

## Rules

1. **Core never imports a vendor SDK, an OS API, Electron or a database.** It only uses the interfaces in
   `packages/core/src/contracts`. New capability = new interface in core + a plug somewhere else.
2. **OS-specific code lives only in `platform-mac` / `platform-win`** (and `renderer/src/platform/mac|win`
   for UI). Keep file names mirrored between the two.
3. **No API keys in the app.** Providers get short-lived tokens from our backend.
4. **Private content stays on the device.** Audio, transcripts and history are never sent to our server
   and never logged. Log timings and errors only.
5. **Never translate the user's speech** unless they asked for a translation.
6. **Actions that send, delete, buy or post** must be tools with `risk: "confirm"`.
7. The renderer never touches Node, the OS or the network directly — it calls `window.subx`
   (typed in `apps/desktop/src/shared/ipc.ts`).
8. Match the surrounding code; keep files small and single-purpose. Use `import type` for types.

## How to…

- **Add an STT/LLM vendor:** `packages/providers/src/stt/<vendor>.ts` implementing `SttProvider`
  (or `llm/<vendor>.ts` → `LlmProvider`), then one `case` in `packages/providers/src/index.ts`.
- **Implement an OS feature:** fill in the stub in `platform-mac/src/<file>.ts`; the Windows owner does
  the same file in `platform-win`. Stubs throw `notImplemented(...)` until done.
- **Add a UI ↔ main call:** channel + type in `apps/desktop/src/shared/ipc.ts` → handler in
  `src/main/index.ts` → expose in `src/preload/index.ts`.
- **Add a voice command:** trigger phrases in `packages/core/src/router.ts`, behaviour as a `Tool`.
- **Test without a mic or keys:** use `@subx/core/fakes` (`FakeStt`, `FakeLlm`, `fakePlatform()`…).

## Gotchas

- Shells started from VS Code may have `ELECTRON_RUN_AS_NODE=1`, which makes Electron run as plain Node.
  If the app won't open, run `unset ELECTRON_RUN_AS_NODE` first.
- Desktop dependencies all go in `devDependencies` so electron-vite bundles them. Native Node modules
  (e.g. uiohook-napi on Windows, better-sqlite3 later) are the exception — put them in `dependencies` and
  allow their install scripts under `allowBuilds` in `pnpm-workspace.yaml`.
- Line endings are LF everywhere (`.gitattributes`); Windows checkouts would otherwise fail the formatter.
- Mac development needs Xcode or its Command Line Tools: `pnpm dev:desktop` builds the Swift helper first.
- No `.env` is needed yet. Vendor keys belong on the backend; see "Environment variables" in
  `docs/WINDOWS.md` for the dev-only rule.
- `DOWNLOAD_FILES` in `packages/shared` must match `artifactName` in `apps/desktop/electron-builder.yml`.
- TypeScript is pinned to 5.9 on purpose (Next.js needs the JS compiler API).

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
