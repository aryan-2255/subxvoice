# packages/providers

One file per vendor: `src/stt/<vendor>.ts` implements `SttProvider`, `src/llm/<vendor>.ts` implements
`LlmProvider`. Register it with one `case` in `src/index.ts`.

- Fill in `capabilities` honestly (streaming, codeSwitching, vocabularyHints) — core relies on them.
- Use the short-lived `token` from `ProviderConfig`; never read vendor API keys from env in the app.
- Pass dictionary words as vocabulary hints when the vendor supports it.
- Never set a fixed language unless `languageHint` is given; auto-detect keeps code-switching working.
