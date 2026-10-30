# SUBXVoice — orientation

Voice-typing desktop app for **macOS and Windows**: hold a hotkey, speak (any language, switching
mid-sentence is fine), and clean text is pasted at the cursor in whatever app has focus.

**Read [`AGENTS.md`](AGENTS.md) for the repo map and the rules.** It is the authority on what goes
where. This file is orientation plus the context system; it does not repeat AGENTS.md.

## Start of every session

Run `/context-read` before doing anything else. It reads `context/INDEX.md` and tells you where
things stand, how the last session ended, and what to do next. Do not start work until the user
confirms — they may have changed their mind since the journal was written.

## Commands

```bash
pnpm install          # once
pnpm check            # biome + typecheck + tests — must pass before you call a task done
pnpm fix              # auto-fix lint/format
pnpm dev:desktop      # run the Electron app
pnpm dev:web          # website on localhost:3000
pnpm build            # what CI runs after check
```

Run a single package's tests with `pnpm --filter @subx/core test` (same for `@subx/desktop`,
`@subx/platform-win`, `@subx/providers`).

## The shape of the thing

Core is a switchboard with sockets; vendors, operating systems and storage are plugs.
`packages/core` only ever talks to the interfaces in `packages/core/src/contracts/`.

One dictation, end to end:

```
hotkey down ─► DictationController.start ─► workflow.open ─► Pipeline.open (STT socket opens now)
                                                          └─► mic.start, chunks pushed live
hotkey up   ─► mic.stop ─► session.finish ─► Soniox finalize ─► dictionary rules ─► router
                        ─► LLM (script / style) ─► inserter (clipboard + Ctrl/⌘V) ─► history
                                                                      audio saved after the paste
```

The STT socket opens on key-**down** and audio streams while the user talks, so key-up only pays for
the tail. Keep it that way — buffering the clip and sending it at release made release→paste scale
with how long they spoke (~5.6 s for a 6.5 s clip, vs ~50 ms now).

`apps/desktop/src/main/workflow.ts` owns the whole app-specific side of that flow (settings, pill
messages, history, audio, failure text). It is injected into `DictationController`, so it is
unit-tested without a microphone.

## Conventions that are easy to get wrong

- **Core imports no vendor SDK, no OS API, no Electron, no database.** New capability = new
  interface in `contracts/` + a plug elsewhere.
- **`platform-mac` and `platform-win` mirror each other's file names.** Same for
  `renderer/src/platform/mac|win`.
- **Desktop dependencies go in `devDependencies`** so electron-vite bundles them. Native modules
  (`koffi`) are the exception: `dependencies`, `external` in `electron.vite.config.ts`, and
  `asarUnpack` in `electron-builder.yml`.
- **The renderer never touches Node, the OS or the network.** It calls `window.subx`, typed in
  `apps/desktop/src/shared/ipc.ts`. Adding a call = channel + type there → handler in `main/index.ts`
  → expose in `preload/index.ts`.
- **Never translate the user's speech.** Roman-script output is transliteration, a different thing.
- **Comments say _why_, not _what_.** The codebase is written that way; match it.
- Pick an option over another → add a paragraph to `docs/decisions.md`.

## Gotchas this project has already been bitten by

- `ELECTRON_RUN_AS_NODE=1` leaks in from VS Code terminals and makes Electron run as plain Node
  (`electron.app` is undefined). `unset ELECTRON_RUN_AS_NODE` before `pnpm dev:desktop`.
- A **Soniox key is bound to its project's region** and returns `401` on any other region's
  endpoint. `SONIOX_REGION` in `.env` must match the key. Default is `in`.
- Electron 44's clipboard API is **promise-based**; `clipboard.readText()` returns a Promise.
- `pnpm-workspace.yaml` → `allowBuilds` gates install scripts. `koffi: true` is required or the
  native binding never unpacks and the app dies at import.
- Live provider tests skip themselves without keys, which is how CI stays green. Absence of
  failures there does not mean the vendors were exercised.

## Secrets

`.env` at the repo root, gitignored, never committed: `SONIOX_API_KEY`, `SONIOX_REGION`,
`OPENROUTER_API_KEY`. `.env.example` documents them. This is a development bridge only — AGENTS.md
rule 3 still stands, and the backend will hand out short-lived tokens later.

## Context system

Where the pieces are. The journal lives in this repo so it travels with the code; the two slash
commands live one level up at the **workspace root** (`pillow/.claude/commands/`), because that is
where Claude Code is rooted and it is not a git repository.

```
subxvoice/CLAUDE.md             ← this file          ─┐ tier 1, always read (~215 lines total)
subxvoice/context/INDEX.md      ← state + topic map  ─┘
subxvoice/context/001-*.md      ← journal, tier 2, on demand only
pillow/.claude/commands/        ← /context-read, /context-write
pillow/CLAUDE.md                ← workspace root: which project is active
```

Both commands work whether the session is rooted at `pillow/` or at `subxvoice/` — they locate the
journal themselves.

Two tiers, so the per-session cost stays flat as history grows.

**Tier 1 — always read.** `CLAUDE.md` + `context/INDEX.md`. Together ~250 lines, and that number
does not grow when the journal does.

**Tier 2 — on demand only.** `context/NNN-*.md`. Read one *only* when INDEX's topic→file table
points at it, or the user asks for full history. **Never read all of them at once** — by file 8 they
cost more than they save, which is the whole reason INDEX exists.

Rules for the numbered files:

- `context/NNN-topic-slug.md`, zero-padded. The filename is an index: `ls context/` should tell you
  what is in each.
- **Append-only.** Never rewritten, summarised or deleted.
- ~1000 lines each. A session entry is never split across two files — if it does not fit, start the
  next file and put the whole entry there.
- `context/INDEX.md` is the one mutable file. `/context-write` rewrites it completely every time.

### docs/ vs context/

| | holds | shape |
|---|---|---|
| `docs/` | durable product knowledge — how it works, why it is that way | timeless, rewritten |
| `context/` | journal — what happened that day, what broke | date-bound, append-only |

A finding that outlives the session (why a capability was dropped, the root cause of a defect) goes
in `docs/`; context gets one line pointing at it. **Writing the same thing in both is the failure
mode.** `docs/` already exists here — add to it rather than restating it in the journal.
