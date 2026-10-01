# SUBXVoice

Typing is optional. Hold a key, speak in any language, and clean text appears wherever your cursor is —
on macOS and Windows.

## Getting started

Requirements: Node 22+, pnpm 11.

```bash
pnpm install
pnpm dev:desktop   # Electron app
pnpm dev:web       # website on http://localhost:3000
pnpm check         # lint + typecheck + tests (run before every PR)
```

If the desktop app opens as plain Node inside a VS Code terminal, run `unset ELECTRON_RUN_AS_NODE`.

## Docs

- [Features](docs/FEATURES.md)
- [Tech stack](docs/TECH_STACK.md)
- [Architecture](docs/architecture.md)
- [Decisions](docs/decisions.md)
- [Agent guide](AGENTS.md) — also the best overview of the repo for humans

## Team

| Area | Owner |
|---|---|
| macOS | Aryan |
| Windows | (friend) |
| Everything else | both, via PRs |
