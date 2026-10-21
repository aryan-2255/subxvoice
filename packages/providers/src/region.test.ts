import { describe, expect, it } from "vitest";
import { isSonioxRegion, SONIOX_REGIONS } from "./index";

describe("Soniox regions", () => {
  it("knows the four data-residency regions", () => {
    expect(Object.keys(SONIOX_REGIONS).sort()).toEqual(["eu", "in", "jp", "us"]);
  });

  it("each region is its own regional websocket endpoint", () => {
    expect(SONIOX_REGIONS.in).toBe("wss://stt-rt.in.soniox.com/transcribe-websocket");
    expect(SONIOX_REGIONS.us).toBe("wss://stt-rt.soniox.com/transcribe-websocket");
    for (const url of Object.values(SONIOX_REGIONS)) {
      expect(url).toMatch(/^wss:\/\/stt-rt(\.[a-z]{2})?\.soniox\.com\/transcribe-websocket$/);
    }
  });

  it("validates a region string (the env var is user input)", () => {
    expect(isSonioxRegion("in")).toBe(true);
    expect(isSonioxRegion("US")).toBe(false); // callers lowercase first
    expect(isSonioxRegion("india")).toBe(false);
    expect(isSonioxRegion("")).toBe(false);
  });
});
