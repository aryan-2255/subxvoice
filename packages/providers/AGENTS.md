# packages/providers

One file per vendor: `src/stt/<vendor>.ts` implements `SttProvider`, `src/llm/<vendor>.ts` implements
`LlmProvider`. Register it with one `case` in `src/index.ts`.

- Fill in `capabilities` honestly (streaming, codeSwitching, vocabularyHints) — core relies on them.
- Take credentials only from `ProviderConfig.token`; never read `process.env` inside a provider. The
  desktop app passes a dev key from `.env` today (`apps/desktop/src/main/providers.ts`) and a
  short-lived backend token later.
- Plugs today: STT `soniox` (streaming websocket), LLM `openrouter`; `fake` for tests.
- Live tests (`src/live.test.ts`) run only when the API keys are set; otherwise they are skipped.
- Pass dictionary words as vocabulary hints when the vendor supports it.
- Never set a fixed language unless `languageHint` is given; auto-detect keeps code-switching working.
