// The handful of Win32 calls the Windows plug needs, in one place.
//
// Why FFI and not uiohook-napi (the original plan): a low-level keyboard hook is silently removed
// by Windows when its callback runs slow, and one exception kills the listener thread — either way
// the hotkey dies for the rest of the run with nothing on screen. Reading key state cannot be
// revoked and cannot desync from a key-up we never saw. See docs/decisions.md.
import koffi from "koffi";

const KEYBDINPUT = koffi.struct("KEYBDINPUT", {
  wVk: "uint16",
  wScan: "uint16",
  dwFlags: "uint32",
  time: "uint32",
  dwExtraInfo: "uintptr",
});

/** On x64 this must come out as 40 bytes or SendInput rejects the batch. */
const INPUT = koffi.struct("INPUT", {
  type: "uint32",
  ki: KEYBDINPUT,
  _pad: koffi.array("uint8", 8),
});

// user32.dll is loaded on first use, not at import: the desktop app imports this package on every OS,
// and loading a Windows DLL at import time crashes it on macOS.
function bind() {
  const lib = koffi.load("user32.dll");
  return {
    getAsyncKeyState: lib.func("__stdcall", "GetAsyncKeyState", "int16", ["int"]),
    sendInput: lib.func("__stdcall", "SendInput", "uint32", ["uint32", koffi.pointer(INPUT), "int"]),
  };
}

let user32: ReturnType<typeof bind> | null = null;
const win32 = () => {
  user32 ??= bind();
  return user32;
};

export const VK = {
  control: 0x11,
  shift: 0x10,
  alt: 0x12,
  lwin: 0x5b,
  rwin: 0x5c,
  lctrl: 0xa2,
  rctrl: 0xa3,
  v: 0x56,
} as const;

const KEYEVENTF_KEYUP = 2;
const INPUT_KEYBOARD = 1;

export function isKeyDown(vk: number): boolean {
  return (win32().getAsyncKeyState(vk) & 0x8000) !== 0;
}

const key = (vk: number, up: boolean) => ({
  type: INPUT_KEYBOARD,
  ki: { wVk: vk, wScan: 0, dwFlags: up ? KEYEVENTF_KEYUP : 0, time: 0, dwExtraInfo: 0n },
  _pad: Array(8).fill(0),
});

/** Presses and releases `vk` while holding `modifiers`. Returns false if Windows dropped any event. */
export function sendChord(modifiers: number[], vk: number): boolean {
  const events = [
    ...modifiers.map((mod) => key(mod, false)),
    key(vk, false),
    key(vk, true),
    ...[...modifiers].reverse().map((mod) => key(mod, true)),
  ];
  return win32().sendInput(events.length, events, koffi.sizeof(INPUT)) === events.length;
}

const MODIFIERS = [VK.control, VK.shift, VK.alt, VK.lwin, VK.rwin];

/**
 * Waits until no modifier is physically held. Pasting while the Windows key is still down would
 * turn our Ctrl+V into Win+V and open clipboard history instead.
 */
export async function waitForModifiersUp(timeoutMs = 1500): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!MODIFIERS.some(isKeyDown)) return true;
    await new Promise((resolve) => setTimeout(resolve, 8));
  }
  return false;
}
