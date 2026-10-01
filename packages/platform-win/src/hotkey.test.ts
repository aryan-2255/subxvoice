import type { HotkeyEvent } from "@subx/core";
import { describe, expect, it } from "vitest";
import { anyOtherKeyDown, parseBinding, WinHotkey } from "./hotkey";
import { VK } from "./win32";

const D = 0x44; // the "D" key, as in Ctrl+Win+D

/** A fake keyboard: a WinHotkey plus the set of keys currently held. */
function keyboard(keys = "ctrl+win") {
  const held = new Set<number>();
  const events: HotkeyEvent[] = [];
  const hotkey = new WinHotkey((vk) => held.has(vk));
  void hotkey.register([{ keys, mode: "exact" }], () => {});
  const tick = () => hotkey.tick((event) => events.push(event));
  return { held, events, tick };
}

describe("parseBinding", () => {
  it("accepts either side of the Windows key", () => {
    expect(parseBinding("ctrl+win")).toEqual([[VK.control], [VK.lwin, VK.rwin]]);
  });

  it("rejects a key the poller cannot read", () => {
    expect(() => parseBinding("ctrl+capslock")).toThrow(/Unsupported hotkey/);
  });
});

describe("WinHotkey", () => {
  it("fires once on press and once on release", () => {
    const { held, events, tick } = keyboard();
    held.add(VK.control).add(VK.lwin);
    tick();
    tick(); // still held — must not fire again
    held.delete(VK.lwin);
    tick();
    expect(events).toEqual([
      { type: "pressed", mode: "exact" },
      { type: "released", mode: "exact" },
    ]);
  });

  it("accepts the right Windows key too", () => {
    const { held, events, tick } = keyboard();
    held.add(VK.control).add(VK.rwin);
    tick();
    held.clear();
    tick();
    expect(events.map((event) => event.type)).toEqual(["pressed", "released"]);
  });

  it("half the combo does nothing", () => {
    const { held, events, tick } = keyboard();
    held.add(VK.control);
    tick();
    held.add(D);
    tick();
    expect(events).toEqual([]);
  });

  it("cancels on another key, and does not then report a release", () => {
    const { held, events, tick } = keyboard();
    held.add(VK.control).add(VK.lwin);
    tick();
    held.add(D); // Ctrl+Win+D — a Windows shortcut, not dictation
    tick();
    tick(); // one cancel only
    held.clear();
    tick();
    expect(events).toEqual([{ type: "pressed", mode: "exact" }, { type: "cancel" }]);
  });

  it("the binding's own Ctrl never counts as another key", () => {
    const { held, events, tick } = keyboard();
    // Windows reports a real Ctrl press through both the generic and the left-side code.
    held.add(VK.control).add(VK.lctrl).add(VK.lwin);
    tick();
    tick();
    held.clear();
    tick();
    expect(events.map((event) => event.type)).toEqual(["pressed", "released"]);
  });

  // The reason this is polled rather than hooked: a key-up we never saw must not wedge it.
  it("recovers when a release is missed entirely", () => {
    const { held, events, tick } = keyboard();
    held.add(VK.control).add(VK.lwin);
    tick();
    held.clear(); // release goes unobserved
    held.add(VK.control).add(VK.lwin);
    tick();
    held.clear();
    tick();
    held.add(VK.control).add(VK.lwin);
    tick();
    expect(events.map((event) => event.type)).toEqual(["pressed", "released", "pressed"]);
  });
});

describe("anyOtherKeyDown", () => {
  it("ignores the binding's keys and their side-specific twins", () => {
    const own = new Set([VK.control, VK.lwin, VK.rwin]);
    expect(anyOtherKeyDown(own, (vk) => vk === VK.lctrl)).toBe(false);
    expect(anyOtherKeyDown(own, (vk) => vk === D)).toBe(true);
  });

  it("a mouse button is not a key", () => {
    expect(anyOtherKeyDown(new Set([VK.control]), (vk) => vk === 0x01)).toBe(false);
  });
});
