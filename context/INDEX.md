# Context index

Rewritten in full by `/context-write`. Read this plus `CLAUDE.md` at the start of every session;
read a numbered file only when the topic table below points at it.

Where things live: this journal is `subxvoice/context/`; the `/context-read` and `/context-write`
commands are one level up at `pillow/.claude/commands/`, because Claude Code is rooted at `pillow/`
and that folder is not a git repository. See `subxvoice/CLAUDE.md` → "Context system".

Last updated: 2026-10-30 · after S-007 · branch `feat/soniox-india-region` at `d6efd82`

## Where things stand

SUBXVoice dictates end to end on Windows and, as of Aryan's work, on macOS too. Hold `Ctrl+Win`
(`fn` on Mac), speak Hindi/English/mixed, release, and Roman-script Hinglish is pasted at the
cursor in about a second. That was not true a month ago: the app recorded audio and saved it to
history with no text, and both inserters threw `notImplemented`.

What is wired now: Soniox streaming speech-to-text over a websocket that opens on key-**down**, so
key-up only pays for the tail (~50 ms on the India endpoint); dictionary rules; the command router;
an OpenRouter transliteration pass on `gpt-oss-120b` routed to Cerebras first, Groq as fallback;
clipboard paste with the user's full clipboard snapshotted and restored; local history with audio
replay; a Settings screen shared by both OSes (hotkey picker, script, microphone, engine status).
Measured release→paste is ~1.1 s, of which STT is ~52 ms — **the LLM is now the dominant cost**,
which is where any further speed work should go.

Two recent fixes are worth knowing because both looked like different bugs than they were. The app
appeared to ignore the Roman-script setting; it was actually a settings store that baked the
defaults of the day into `settings.json`, so an old `native` default kept winning (S-003). Then
dictated English came out as "Pleez note dait…"; Soniox writes Indian-accented English *in
Devanagari*, and the prompt was romanising it phonetically instead of recognising English words
(S-005). Both are fixed and covered by tests.

PR #1 is merged. PR #2 (`feat/soniox-india-region`) is open with the India region, the workflow
engine extraction and the prompt fix. Aryan has pushed Mac paste and a shared clipboard module on
top of `main`; this branch was rebuilt off his latest `main` so his changes are intact.

Not built: `apps/api` (backend, login, sync, stats, teams), `packages/mcp` (types and a comment
only), active-app context reading on either OS, `openApp` on Windows, `native/win-helper`, SQLite
(history and settings are JSON files). No auth, no sync, no release pipeline exercised yet.

## Continue from here

Nothing is mid-flight. PR #2 is pushed and green; the user reviews and merges on their own
schedule.

The obvious next target is **LLM latency**, now ~800–1100 ms of a ~1.1 s release→paste. Options:
shorter prompt, streaming the completion, or a smaller model for short utterances. Start at
`packages/core/src/prompts.ts` and `packages/providers/src/llm/openrouter.ts`.

Smaller, well-defined pickups: `AGENTS.md`'s repo map does not list
`apps/desktop/src/main/workflow.ts`; `platform-win/src/context.ts` and `desktop.ts` are still
`notImplemented`.

## Topic → file

| Topic | File |
|---|---|
| Soniox provider: streaming, `finalize`, `<fin>`/`<end>` markers, keepalive | 001 (S-001, S-002) |
| Soniox regions, the India endpoint, region/key binding, measured numbers | 001 (S-004) |
| OpenRouter provider, model benchmark, Cerebras vs Groq | 001 (S-001, S-002) |
| Transliteration prompt, English-in-Devanagari, mishearing repair | 001 (S-005) |
| Streaming pipeline: `open/push/finish`, why not batch, latency measurements | 001 (S-002) |
| Windows hotkey and paste: koffi, `GetAsyncKeyState`, `SendInput`, struct sizes | 001 (S-001) |
| Workflow engine extraction, `workflow.ts` design | 001 (S-004) |
| Settings store, frozen-defaults bug | 001 (S-003) |
| Toolchain traps: Python interpreters, pnpm `allowBuilds`, `ELECTRON_RUN_AS_NODE`, koffi bundling | 001 (S-001) |
| Merging with Aryan's `main`, what he added | 001 (S-004) |
| Repo audit: real dependency list, doc accuracy, stub inventory | 001 (S-006) |

## Open decisions

- **Where to cut the remaining ~1 s.** Prompt length, response streaming, or a smaller model for
  short input. Nothing chosen; no work started.
- **Whether to pre-warm the Soniox socket** before key-down, as the earlier Python prototype did.
  Currently it opens on key-down (~146 ms from India), hidden behind the user starting to speak.
  Not needed at current latency.
- **`SONIOX_REGION` for the Mac side.** Aryan needs the India key and `SONIOX_REGION=in`, or his own
  region's key. Not yet confirmed with him.

## Ruled out

- Batch speech-to-text (buffer the clip, send at release) — release→paste scaled with how long the
  user spoke, ~5.6 s for a 6.5 s clip. 001 (S-002).
- A low-level Windows keyboard hook (uiohook-napi) — Windows silently removes it when the callback
  is slow and one exception kills it for the run. 001 (S-001).
- Closing the websocket to finalise — puts the close handshake (~1.2 s to the US) on the critical
  path. `{"type":"finalize"}` instead. 001 (S-001).
- `llama-4-scout` for transliteration — left Devanagari untouched. `qwen3-32b` — 832 ms and wrong.
  001 (S-001).
- Restoring only clipboard *text* after a paste — would erase an image the user had copied. Aryan
  replaced it with a full-format snapshot. `docs/decisions.md`, 2026-10-01.

## Settled

- `context/` is **committed**, not gitignored — decided 2026-10-30, S-007. The journal travels with
  the repo, so Aryan sees it too.

## Sessions

| # | Date | What | File |
|---|---|---|---|
| S-001 | 2026-10-01 | Connected the pipeline; built the Windows platform; PR #1 | 001 |
| S-002 | 2026-10-01 | Roman by default; streaming STT; Cerebras first | 001 |
| S-003 | 2026-10-01 | Settings store froze old defaults into the saved file | 001 |
| S-004 | 2026-10-21 | Soniox India region; workflow engine; merged Aryan's main; PR #2 | 001 |
| S-005 | 2026-10-30 | English-in-Devanagari came out phonetic; prompt rewritten | 001 |
| S-006 | 2026-10-30 | Deep repo read; context system set up | 001 |
| S-007 | 2026-10-30 | Commands moved to workspace root so they are callable | 001 |
