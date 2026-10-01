import type { AppContext } from "./types";

export function styleRewritePrompt(context: AppContext): string {
  const lines = [
    "You turn dictated speech into clean written text.",
    "Keep every part in the language it was spoken in. Never translate.",
    "Keep the meaning. Remove filler words, fix grammar and punctuation.",
    "Reply with the final text only.",
  ];
  if (context.appName) {
    lines.push(`The text will be typed into ${context.appName}; match the tone people use there.`);
  }
  return lines.join("\n");
}
