# packages/core

The heart of the app, and the only package every other package depends on.

- `src/contracts/` — the plug-point interfaces. Changing one affects every plug: update the fakes,
  both platform packages and the providers in the same change.
- No imports of Electron, Node built-ins, vendor SDKs or databases. Core must run anywhere.
- Every behaviour change needs a test (`*.test.ts`, Vitest). Use the fakes in `src/fakes.ts`.
- Rules (`rules.ts`) must stay deterministic and fast — no network, no AI.
- The router must never turn ordinary dictation into a command; only explicit trigger phrases at the
  start count.
