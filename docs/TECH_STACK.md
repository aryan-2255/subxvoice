# SUBXVoice — Tech Stack

One language everywhere: **TypeScript** (Python only for future ML work).

## Team
| Area | Owner |
|---|---|
| macOS (platform-mac, Mac UI bits, mac-helper) | Aryan |
| Windows (platform-win, Windows UI bits, win-helper) | Aryan's teammate — see [WINDOWS.md](WINDOWS.md) |
| Core, providers, shared UI, backend, web | Both (changes via PR, reviewed by the other) |

## Desktop App
| Part | Tech |
|---|---|
| App shell | Electron + electron-vite |
| Mic capture | Mac: Swift helper (AVAudioEngine), on only while the key is held. Fallback: Web Audio |
| Hold-to-talk hotkey | Mac: Swift helper event tap, default fn (🌐). Windows: `GetAsyncKeyState` polling via koffi, default Ctrl + Win |
| Paste at cursor | Full clipboard snapshot → Cmd/Ctrl+V → restore. Mac: ⌘V from the Swift helper; Windows: `SendInput` via koffi |
| Active app / title / URL | get-windows (planned) |
| Reading focused text, edit detection | Native helper — Swift (Mac, `native/mac-helper`), C# (Windows, planned) |
| Local storage | JSON files + WAV recordings today (`apps/desktop/src/main/stores.ts`); SQLite + Drizzle later |
| Token storage | Electron safeStorage (planned, with login) |
| Installer | electron-builder — DMG (Mac), NSIS .exe (Windows) |
| Auto-update | electron-updater + GitHub Releases (planned) |

Rule: the renderer (UI) never touches the DB, network or OS directly — it asks the main process through a typed preload bridge.

## GUI (same on Mac and Windows)
In use today:

| Part | Tech |
|---|---|
| Framework | React + TypeScript |
| Styling | Tailwind CSS v4 with design tokens in `renderer/src/styles.css` (cobalt accent is reserved for voice) |
| Icons | Small inline SVG set in `renderer/src/shared/icons.tsx` |
| Navigation | Plain React state (four pages) |
| Charts | The "voice strip" bars are plain divs |
| Audio playback | `<audio>` with a Blob of the local WAV |
| Font | system-ui (SF Pro on Mac, Segoe UI on Windows) |

Add these only when a screen actually needs them: shadcn/ui (components), Motion (animation), Zustand
(shared state), TanStack Query (backend data), TanStack Router (more pages), react-hook-form + Zod (big
forms), Recharts (real charts), wavesurfer.js (waveforms), TanStack Virtual (very long lists), i18next.

### App windows
| Window | Notes |
|---|---|
| Main window | Built: Home (stats), History, Dictionary, Settings. Planned: Shortcuts, Account |
| Recording pill | Built: small, transparent, always on top, **never takes focus** (otherwise the paste goes to the wrong app) |
| Permissions | Built into Settings (plus a banner on Home when one is missing). A first-run walkthrough is planned |
| Command popup | Planned: "What should the email be about?" — near the cursor, also non-focusing |
| Tray / menu bar | Built: Electron Tray with Open / Quit |

### Only these parts differ per OS (`platform/mac`, `platform/win`)
| | Mac | Windows |
|---|---|---|
| Icon location | Menu bar (monochrome template icon), optional hidden Dock icon | System tray |
| Title bar | `hiddenInset` + traffic lights | Native title bar today; `titleBarOverlay` / Mica later |
| Permissions | Mic, Accessibility, Input Monitoring | Mic |
| Default hotkey | fn (🌐) | Ctrl + Win |
| Font | system-ui → SF Pro | system-ui → Segoe UI Variable |

## Speech and language engines
| Part | Tech |
|---|---|
| Speech-to-text | Soniox real-time (`stt-rt-v5`), streamed over a websocket while the user speaks; Hindi + English hints |
| Rewriting / Roman script | OpenRouter → `openai/gpt-oss-120b`, routed to Cerebras first, Groq as fallback |
| Keys | `.env` in development (main process only, never packaged); backend tokens in production |

## Backend
| Part | Tech |
|---|---|
| API | Hono (TypeScript), versioned `/v1` |
| Database + Auth | Supabase (Postgres, Google + email login) |
| ORM | Drizzle |
| Validation / shared types | Zod (`packages/shared`) |
| Rate limit / cache | Upstash Redis |
| Background jobs | Inngest |
| Deploy | Railway → Cloudflare Workers when scaling |

## Website + Team Dashboard
Next.js on Vercel.

## Where Data Lives
| Data | Location |
|---|---|
| Audio, transcripts, history | Device only |
| Dictionary, shortcuts, settings | Device + synced |
| Stats (numbers only) | Postgres |
| Teams | Postgres |
| STT / LLM API keys | Backend only — app gets short-lived tokens |

## Tooling
| Part | Tech |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Lint + format | Biome |
| Tests | Vitest, Playwright |
| Errors / crashes | Sentry |
| Analytics + feature flags | PostHog |
| CI/CD | GitHub Actions (Mac + Windows builds, signing, release) |
| ML / own model (later) | Python |

## Repo Layout
```
subxvoice/
├── apps/
│   ├── desktop/        Electron (main = core + OS plugs, renderer = UI)
│   ├── api/            Hono backend            (planned)
│   └── web/            Next.js website
├── packages/
│   ├── core/           interfaces (plug points) + pipeline + rules + router
│   ├── providers/      STT / LLM plugs
│   ├── platform-mac/
│   ├── platform-win/
│   ├── mcp/            MCP client + server     (types only for now)
│   └── shared/         Zod types shared by app, api, web
└── native/
    ├── mac-helper/     Swift (hotkey, mic, permissions)
    └── win-helper/     C# (planned)
```

## Must-haves People Forget
1. Code signing + Mac notarization (Apple Developer $99/yr, Windows cert).
2. Auto-update from the first release.
3. No API keys inside the app.
4. Per-user usage limits and cost tracking (STT is billed per minute).
5. Versioned API — old app versions keep calling it.
6. Remote config to switch providers without an app update.
7. Separate dev / staging / prod.
8. Never log transcripts — only timings and errors.
9. Privacy policy (India DPDP Act) before launch.
10. Log latency of every pipeline stage.

## Reserved Space: Offline Model (not decided)
Nothing is built for this now. The design just keeps it possible:
- A local model would be one more `SttProvider` plug (e.g. whisper.cpp running as a sidecar process).
- It would be downloaded on demand (~400–600 MB), never bundled in the installer.
- A setting would choose Cloud / Auto / Offline.

## Build Order
1. ✅ Plug-point interfaces, pipeline, rules, router (unit-tested)
2. ✅ Mac: fn hotkey + native mic (Swift helper), recording pill, tray, dashboard
3. ✅ Local history (with audio playback) + dictionary
4. ✅ Website with download buttons
5. ✅ Speech-to-text (Soniox, streaming) → paste at the cursor, on Mac and Windows
6. ✅ Windows hotkey + paste; Roman-script output via OpenRouter; Settings (hotkey, script, mic)
7. ⏳ Style mode (LLM), voice commands
8. ⏳ Backend (login, sync, stats), installers, signing, auto-update
9. ⏳ Teams, MCP
