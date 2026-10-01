import ApplicationServices
import AVFoundation
import IOKit.hid

/// Reads the macOS permissions SUBXVoice needs. Values: granted, denied, not_asked.
struct PermissionChecker {
    func all() -> [String: String] {
        [
            "microphone": microphone(),
            "accessibility": AXIsProcessTrusted() ? "granted" : "denied",
            "input_monitoring": inputMonitoring(),
        ]
    }

    /// Shows the system prompt the first time; after that the user has to use System Settings.
    func request(_ permission: String) {
        if permission == "input_monitoring" {
            _ = IOHIDRequestAccess(kIOHIDRequestTypeListenEvent)
        }
    }

    private func inputMonitoring() -> String {
        switch IOHIDCheckAccess(kIOHIDRequestTypeListenEvent) {
        case kIOHIDAccessTypeGranted: return "granted"
        case kIOHIDAccessTypeDenied: return "denied"
        default: return "not_asked"
        }
    }

    private func microphone() -> String {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized: return "granted"
        case .notDetermined: return "not_asked"
        default: return "denied"
        }
    }
}
