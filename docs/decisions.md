# Decisions

Newest first. Add an entry whenever you pick one option over another — one short paragraph, with the why.

### 2026-10-01 — Paste keeps the user's whole clipboard
Paste goes through the clipboard, so we snapshot every format first (Electron 44's `clipboard.read()`,
read eagerly because items are lazy) and restore it ~400 ms later. Restoring only text would erase an
image the user had copied. A failed paste never loses the dictation: it is saved to history and the
text stays on the clipboard.

### 2026-10-01 — Windows hotkey by polling key state (koffi), not a keyboard hook
A low-level keyboard hook (uiohook-napi) is silently removed by Windows when its callback is slow, and one
exception kills it for the rest of the run. Polling `GetAsyncKeyState` every 15 ms can't be revoked and
can't miss a key-up. koffi calls Win32 directly; `user32.dll` is loaded on first use because the package is
imported on macOS too.

### 2026-10-01 — Soniox for speech-to-text, OpenRouter for Roman script
Soniox streams over a websocket while the user talks, so only the tail is left at key release, and it
handles Hindi-English code-switching. Roman-script (Hinglish) output is a transliteration pass through
OpenRouter's `gpt-oss-120b`, routed to Cerebras first (fastest and most consistent in our Hindi-English
benchmark), Groq as fallback; pure-Latin text skips the LLM entirely. Keys come from `.env` in development
only, until the backend issues tokens.

### 2026-09-30 — Native Swift helper for hotkey and mic on Mac
uiohook-napi didn't react to real key presses in testing, can't see the fn key, and Chromium needs ~300 ms
to open the mic — so we either cut the first word or kept the mic on (the macOS indicator made it look
like a meeting was being recorded). A small Swift helper (event tap + AVAudioEngine) detects fn like
Wispr Flow and Willow, starts the mic in ~100 ms, and turns it fully off between dictations.

### 2026-09-30 — TypeScript everywhere, Electron for desktop
The team does not know Rust. Electron keeps every part (desktop, backend, website, MCP) in TypeScript,
and Node in the main process runs the MCP SDK, SQLite and system hooks directly. Cost: ~150 MB RAM and a
~100 MB installer. The UI is React and core is interface-based, so moving to Tauri later only means
rewriting the Node-specific plugs.

### 2026-09-30 — One GUI for both OSes
Same React UI on Mac and Windows. Only title bar, tray / menu bar, onboarding steps and shortcut labels
differ, and those live in `renderer/src/platform/mac|win`. Separate native GUIs (SwiftUI + WinUI) would
double the work and need two new languages.

### 2026-09-30 — Backend in TypeScript (Hono), not Go
The backend is light (login, sync, stats, tokens); the heavy work happens at STT/LLM providers. One
language and shared Zod types matter more than Go's speed here. Any single service can be rewritten
later without touching the app, because the API contract stays the same.

### 2026-09-30 — Plug-point architecture
Core defines interfaces; vendors, OSes, storage and MCP are plugs. Lets us start on vendor APIs and
switch to our own models later, add a fallback provider, and let the Mac and Windows owners work in
parallel on mirrored files.

### 2026-09-30 — Local-first privacy
Audio, transcripts and history stay on the device. The server only stores numbers (stats), synced
settings and team data.

### 2026-09-30 — Offline model: space reserved, not decided
A local STT model (~400–600 MB) would be one more `SttProvider`, downloaded on demand and run as a
sidecar process. Nothing is built for it yet.
