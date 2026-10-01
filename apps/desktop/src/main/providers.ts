// Where the STT and LLM plugs get their credentials.
//
// AGENTS.md rule 3 is "no API keys in the app": in production the backend hands out short-lived
// tokens and this file reads them from there instead. Until that backend exists, a .env at the
// repo root keeps development working. Only the token source changes later — nothing else.
import { join } from "node:path";
import type { LlmProvider, SttProvider } from "@subx/core";
import { createLlm, createStt } from "@subx/providers";
import { app } from "electron";

export interface Engines {
  stt?: SttProvider;
  llm?: LlmProvider;
  /** Why an engine is missing, shown in Settings. */
  problems: string[];
}

/** Loads the repo-root .env in development. Packaged builds get their tokens from the backend. */
export function loadDevEnv(): void {
  if (app.isPackaged) return;
  for (const path of [join(app.getAppPath(), "../../.env"), join(process.cwd(), ".env")]) {
    try {
      process.loadEnvFile(path);
      return;
    } catch {
      // Missing or unreadable: try the next location, then fall back to the real environment.
    }
  }
}

export function createEngines(): Engines {
  const problems: string[] = [];
  let stt: SttProvider | undefined;
  let llm: LlmProvider | undefined;

  const sttToken = process.env.SONIOX_API_KEY?.trim();
  if (sttToken) {
    try {
      stt = createStt({ id: "soniox", token: sttToken, model: process.env.SONIOX_MODEL });
    } catch (error) {
      problems.push(describe("Speech-to-text", error));
    }
  } else {
    problems.push("Speech-to-text is off: SONIOX_API_KEY is not set.");
  }

  const llmToken = process.env.OPENROUTER_API_KEY?.trim();
  if (llmToken) {
    try {
      llm = createLlm({
        id: "openrouter",
        token: llmToken,
        model: process.env.OPENROUTER_MODEL,
        // Cerebras is fastest + most consistent on Hindi-English; groq as fallback.
        order: ["cerebras", "groq"],
      });
    } catch (error) {
      problems.push(describe("Rewriting", error));
    }
  } else {
    problems.push("Rewriting and Hinglish are off: OPENROUTER_API_KEY is not set.");
  }

  return { stt, llm, problems };
}

const describe = (what: string, error: unknown) =>
  `${what} is off: ${error instanceof Error ? error.message : String(error)}`;
