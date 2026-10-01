# SUBXVoice — Tech Stack

One language everywhere: **TypeScript** (Python only for future ML work).

## Team
| Area | Owner |
|---|---|
| macOS (platform-mac, Mac UI bits, mac-helper) | Aryan |
| Windows (platform-win, Windows UI bits, win-helper) | Friend |
| Core, providers, shared UI, backend, web | Both (changes via PR, reviewed by the other) |

## Desktop App
| Part | Tech |
|---|---|
| App shell | Electron + electron-vite |
| Mic capture | Mac: Swift helper (AVAudioEngine), on only while the key is held. Fallback: Web Audio |
| Hold-to-talk hotkey | Mac: Swift helper event tap, default fn (🌐). Windows: planned (uiohook-napi or C# helper) |
| Paste at cursor | Electron clipboard + Cmd/Ctrl+V posted by the native helper |
| Active app / title / URL | get-windows |
| Reading focused text, edit detection | Native helper — Swift (Mac, `native/mac-helper`), C# (Windows, planned) |
| Local DB | SQLite (better-sqlite3) + Drizzle ORM |
| Token storage | Electron safeStorage |
| Installer | electron-builder — DMG (Mac), NSIS .exe (Windows) |
| Auto-update | electron-updater + GitHub Releases |

Rule: the renderer (UI) never touches the DB, network or OS directly — it asks the main process through a typed preload bridge.

## GUI (same on Mac and Windows)
| Part | Tech |
|---|---|
| Framework | React + TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (Radix-based, code lives in our repo) |
| Icons | lucide-react |
| Animation (recording pill, transitions) | Motion (Framer Motion) |
| State | Zustand |
| Server data | TanStack Query |
| Routing (main window) | TanStack Router (hash history) |
| Forms (settings, dictionary) | react-hook-form + Zod |
| Stats charts | shadcn charts (Recharts) |
| Audio playback + waveform in history | wavesurfer.js |
| Long history list | TanStack Virtual |
| UI translations (later) | i18next |
| Design | Figma |

### App windows
| Window | Notes |
|---|---|
| Main window | Home (stats), History, Dictionary, Shortcuts, Settings, Account |
| Recording pill | Small, transparent, always on top, **never takes focus** (otherwise the paste goes to the wrong app) |
| Onboarding | Permission steps + first test dictation |
| Command popup | "What should the email be about?" — near the cursor, also non-focusing |
| Tray / menu bar | Electron Tray + native menu |

### Only these parts differ per OS (`platform/mac`, `platform/win`)
| | Mac | Windows |
|---|---|---|
| Icon location | Menu bar (monochrome template icon), optional hidden Dock icon | System tray |
| Title bar | `hiddenInset` + traffic lights, vibrancy | `titleBarOverlay`, Mica material (Win 11) |
| Onboarding | Mic, Accessibility, Input Monitoring | Mic |
| Shortcut labels | ⌘ ⌥ Fn | Ctrl Alt Win |
| Font | system-ui → SF Pro | system-ui → Segoe UI Variable |

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
1. Plug-point interfaces + STT benchmark
2. Desktop core on Mac (hotkey → mic → STT → paste) + recording pill
3. Local history + dictionary
4. Backend (login + sync + stats)
5. Windows plugs
6. Website
7. Teams, MCP
