import { describe, expect, it } from "vitest";
import { Router } from "./router";

describe("Router", () => {
  const router = new Router();

  it("routes a trigger phrase at the start to a command", () => {
    expect(router.route("Write a mail to my professor.", "exact")).toEqual({
      kind: "command",
      command: "email",
      rest: "to my professor",
    });
  });

  it("keeps normal dictation as dictation, even when it mentions a trigger", () => {
    expect(router.route("I will write a mail tomorrow", "style")).toEqual({
      kind: "dictate",
      mode: "style",
    });
  });
});
