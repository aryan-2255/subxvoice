import type { Mode } from "./types";

export type Route = { kind: "dictate"; mode: Mode } | { kind: "command"; command: string; rest: string };

export interface CommandTrigger {
  command: string;
  phrases: string[];
}

export const DEFAULT_TRIGGERS: CommandTrigger[] = [
  {
    command: "email",
    phrases: ["write a mail", "write an email", "write a email", "compose an email"],
  },
  {
    command: "slack_message",
    phrases: ["write a slack message", "write a message on slack"],
  },
];

/**
 * Decides what kind of request a transcript is. Only a trigger phrase at the very start
 * counts as a command, so normal dictation is never hijacked. An LLM classifier can be
 * added later for unclear cases.
 */
export class Router {
  private readonly phrases: { phrase: string; command: string }[];

  constructor(triggers: CommandTrigger[] = DEFAULT_TRIGGERS) {
    this.phrases = triggers
      .flatMap((trigger) =>
        trigger.phrases.map((phrase) => ({ phrase: phrase.toLowerCase(), command: trigger.command })),
      )
      .sort((a, b) => b.phrase.length - a.phrase.length);
  }

  route(text: string, mode: Mode): Route {
    const normalized = text
      .toLowerCase()
      .replace(/[.,!?।]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    for (const { phrase, command } of this.phrases) {
      if (normalized === phrase || normalized.startsWith(`${phrase} `)) {
        return { kind: "command", command, rest: normalized.slice(phrase.length).trim() };
      }
    }
    return { kind: "dictate", mode };
  }
}
