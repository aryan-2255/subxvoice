import ApplicationServices
import CoreGraphics
import Foundation

/// Sends ⌘V to the focused app. The text is already on the clipboard (the app put it there).
final class Paster {
    private static let vKeycode: CGKeyCode = 9 // "V" on ANSI/ISO layouts
    private static let commandKeycode: CGKeyCode = 55
    private static let modifierMask: CGEventFlags = [
        .maskCommand, .maskAlternate, .maskControl, .maskShift, .maskSecondaryFn,
    ]
    private static let waitLimit: TimeInterval = 1.5

    private let output: Output
    /// Created once: the first CGEventSource and Accessibility check cost ~300 ms, which would
    /// otherwise land on the user's first paste.
    private let source = CGEventSource(stateID: .combinedSessionState)

    init(output: Output) {
        self.output = output
        _ = AXIsProcessTrusted()
    }

    func paste() {
        guard AXIsProcessTrusted() else {
            output.error("paste_failed", "Allow Accessibility for SUBXVoice so it can paste. The text is on your clipboard.")
            return
        }
        waitForModifiersUp(deadline: Date().addingTimeInterval(Self.waitLimit))
    }

    /// The user is usually still letting go of the hotkey. Pasting while e.g. ⌥ is held would send
    /// ⌘⌥V instead, so wait (without blocking the run loop) until every modifier is physically up.
    /// The hardware state is used so our own synthetic ⌘ never makes us wait for ourselves.
    private func waitForModifiersUp(deadline: Date) {
        let held = CGEventSource.flagsState(.hidSystemState).intersection(Self.modifierMask)
        if !held.isEmpty, Date() < deadline {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.008) { self.waitForModifiersUp(deadline: deadline) }
            return
        }
        // Full sequence (⌘ down, V down/up, ⌘ up) so no app is left thinking ⌘ is still held.
        post(Self.commandKeycode, down: true, flags: .maskCommand)
        post(Self.vKeycode, down: true, flags: .maskCommand)
        post(Self.vKeycode, down: false, flags: .maskCommand)
        post(Self.commandKeycode, down: false, flags: [])
        output.send(["type": "pasted"])
    }

    private func post(_ keycode: CGKeyCode, down: Bool, flags: CGEventFlags) {
        let event = CGEvent(keyboardEventSource: source, virtualKey: keycode, keyDown: down)
        event?.flags = flags
        event?.post(tap: .cgSessionEventTap)
    }
}
