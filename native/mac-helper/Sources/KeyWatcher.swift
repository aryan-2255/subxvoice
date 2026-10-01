import CoreGraphics
import Foundation

/// Watches hold-to-talk keys with a listen-only event tap (needs Input Monitoring).
///
/// Only watched keys are reported by name. Any other key pressed while a watched key is held is
/// reported as "other" (so the app can cancel) — which key it was is never sent.
final class KeyWatcher {
    /// Modifier keycode → (name, device-specific flag bit), so left and right keys are told apart.
    private static let modifiers: [Int64: (name: String, flag: UInt64)] = [
        63: ("fn", 0x80_0000), // fn / 🌐 (secondary fn flag)
        61: ("right_option", 0x40),
        58: ("left_option", 0x20),
        54: ("right_command", 0x10),
        55: ("left_command", 0x08),
        62: ("right_ctrl", 0x2000),
        59: ("left_ctrl", 0x01),
    ]

    /// Set SUBX_HELPER_DEBUG=1 to print every event the tap sees to stderr (local debugging only).
    private static let debug = ProcessInfo.processInfo.environment["SUBX_HELPER_DEBUG"] == "1"

    private let output: Output
    private var watched: Set<String> = []
    private var down: Set<String> = []
    private var tap: CFMachPort?

    init(output: Output) {
        self.output = output
    }

    func watch(_ keys: [String]) {
        watched = Set(keys)
        down.removeAll()
        if tap == nil, !createTap() {
            output.error("tap_failed", "Allow Input Monitoring for SUBXVoice so it can detect the hotkey.")
            return
        }
        output.send(["type": "watching", "keys": keys])
    }

    private func createTap() -> Bool {
        let mask = (1 << CGEventType.flagsChanged.rawValue) | (1 << CGEventType.keyDown.rawValue)
        let callback: CGEventTapCallBack = { _, type, event, context in
            if let context {
                Unmanaged<KeyWatcher>.fromOpaque(context).takeUnretainedValue().handle(type, event)
            }
            return Unmanaged.passUnretained(event)
        }
        guard let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .listenOnly,
            eventsOfInterest: CGEventMask(mask),
            callback: callback,
            userInfo: Unmanaged.passUnretained(self).toOpaque()
        ) else { return false }
        CFRunLoopAddSource(CFRunLoopGetMain(), CFMachPortCreateRunLoopSource(nil, tap, 0), .commonModes)
        CGEvent.tapEnable(tap: tap, enable: true)
        self.tap = tap
        return true
    }

    private func handle(_ type: CGEventType, _ event: CGEvent) {
        if Self.debug {
            // Modifier names only; ordinary keys are never identified, even in debug output.
            let keycode = event.getIntegerValueField(.keyboardEventKeycode)
            let what = type == .flagsChanged
                ? "modifier \(Self.modifiers[keycode]?.name ?? "keycode \(keycode)") flags=0x\(String(event.flags.rawValue, radix: 16))"
                : type == .keyDown ? "a key was pressed" : "event type \(type.rawValue)"
            FileHandle.standardError.write("[mac-helper] \(what)\n".data(using: .utf8)!)
        }
        switch type {
        case .tapDisabledByTimeout, .tapDisabledByUserInput:
            if let tap { CGEvent.tapEnable(tap: tap, enable: true) }
        case .flagsChanged:
            let keycode = event.getIntegerValueField(.keyboardEventKeycode)
            guard let key = Self.modifiers[keycode], watched.contains(key.name) else { return }
            let isDown = event.flags.rawValue & key.flag != 0
            if isDown == down.contains(key.name) { return }
            if isDown { down.insert(key.name) } else { down.remove(key.name) }
            output.send(["type": "key", "key": key.name, "down": isDown])
        case .keyDown:
            if !down.isEmpty, event.getIntegerValueField(.keyboardEventAutorepeat) == 0 {
                output.send(["type": "key", "key": "other", "down": true])
            }
        default:
            break
        }
    }
}
