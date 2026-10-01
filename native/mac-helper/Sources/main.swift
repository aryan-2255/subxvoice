// SUBXVoice mac helper: hotkey detection, microphone capture and permission checks.
// Talks to the Electron app with one JSON object per line: commands on stdin, events on stdout.
import Foundation

let output = Output()
let keys = KeyWatcher(output: output)
let mic = MicCapture(output: output)
let permissions = PermissionChecker()

func handle(_ line: String) {
    guard let data = line.data(using: .utf8),
          let command = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let name = command["cmd"] as? String
    else {
        output.error("bad_command", "Could not parse command: \(line)")
        return
    }
    switch name {
    case "watch":
        keys.watch(command["keys"] as? [String] ?? [])
    case "mic_start":
        mic.start()
    case "mic_stop":
        mic.stop()
    case "permissions":
        output.send(["type": "permissions", "permissions": permissions.all()])
    case "request":
        permissions.request(command["permission"] as? String ?? "")
        output.send(["type": "permissions", "permissions": permissions.all()])
    default:
        output.error("bad_command", "Unknown command: \(name)")
    }
}

// Commands are read on a background thread and handled on the main thread, where the event tap
// and the audio engine live. When the app quits it closes stdin, and the helper exits with it.
Thread.detachNewThread {
    while let line = readLine() {
        DispatchQueue.main.async { handle(line) }
    }
    exit(0)
}

mic.warmUp()
output.send(["type": "ready"])
RunLoop.main.run()
