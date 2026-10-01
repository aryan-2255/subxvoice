import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonSettingsStore } from "./stores";

interface Settings {
  hotkey: string;
  script: "native" | "roman";
  microphoneId: string;
}

const DEFAULTS: Settings = { hotkey: "ctrl+win", script: "roman", microphoneId: "" };

let dir: string;
let path: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "subx-settings-"));
  path = join(dir, "settings.json");
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe("JsonSettingsStore", () => {
  it("returns the defaults when nothing is saved", async () => {
    const store = new JsonSettingsStore<Settings>(path, DEFAULTS);
    expect(await store.all()).toEqual(DEFAULTS);
  });

  it("persists only what the user set, not the defaults", async () => {
    const store = new JsonSettingsStore<Settings>(path, DEFAULTS);
    await store.update({ microphoneId: "mic-1" });
    // The file must not freeze hotkey/script — only the field that was set.
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual({ microphoneId: "mic-1" });
  });

  // The exact bug this guards: an old default sitting in the file would otherwise win forever.
  it("tracks a changed default for a field the user never chose", async () => {
    // Simulate an older build that persisted the default of the day.
    const old = new JsonSettingsStore<Settings>(path, { ...DEFAULTS, script: "native" });
    await old.update({ hotkey: "ctrl+alt" }); // user only picked a hotkey

    // New build whose default is "roman": the user never chose a script, so they get the new one.
    const fresh = new JsonSettingsStore<Settings>(path, DEFAULTS);
    const settings = await fresh.all();
    expect(settings.script).toBe("roman");
    expect(settings.hotkey).toBe("ctrl+alt"); // their real choice is kept
  });

  it("keeps a script the user explicitly chose", async () => {
    const store = new JsonSettingsStore<Settings>(path, DEFAULTS);
    await store.update({ script: "native" });
    const reopened = new JsonSettingsStore<Settings>(path, DEFAULTS);
    expect((await reopened.all()).script).toBe("native");
  });
});
