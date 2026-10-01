import Foundation

/// Writes one JSON object per line to stdout. Safe to call from any thread.
final class Output {
    private let lock = NSLock()

    func send(_ message: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: message) else { return }
        lock.lock()
        defer { lock.unlock() }
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data([0x0A]))
    }

    func error(_ code: String, _ message: String) {
        send(["type": "error", "code": code, "message": message])
    }
}
