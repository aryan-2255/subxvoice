import AVFoundation
import Foundation

/// Records the default microphone only between start and stop, as 16 kHz mono Int16 in 50 ms
/// chunks. The engine is fully stopped afterwards, so the macOS mic indicator turns off.
final class MicCapture {
    private static let chunkSamples = 800 // 50 ms at 16 kHz
    private static let target = AVAudioFormat(
        commonFormat: .pcmFormatInt16, sampleRate: 16000, channels: 1, interleaved: true
    )!

    private let output: Output
    private let engine = AVAudioEngine()
    private let queue = DispatchQueue(label: "subx.mic")
    private var converter: AVAudioConverter?
    private var pending: [Int16] = []
    private var running = false
    private var tapFormat: AVAudioFormat?
    private var startedAt = Date()
    private var reportLatency = false

    init(output: Output) {
        self.output = output
    }

    /// Installs the tap and prepares the engine ahead of time (the mic stays off), which makes
    /// starting faster.
    func warmUp() {
        guard AVCaptureDevice.authorizationStatus(for: .audio) == .authorized else { return }
        _ = installTap()
        engine.prepare()
    }

    func start() {
        guard !running else { return }
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized:
            begin()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .audio) { granted in
                DispatchQueue.main.async {
                    if granted { self.begin() } else { self.denied() }
                }
            }
        default:
            denied()
        }
    }

    func stop() {
        guard running else {
            output.send(["type": "mic_stopped"])
            return
        }
        running = false
        engine.stop()
        // Runs after every buffer already queued, so no audio is lost.
        queue.async {
            self.flush()
            self.output.send(["type": "mic_stopped"])
        }
        engine.prepare()
    }

    private func begin() {
        startedAt = Date()
        reportLatency = true
        guard installTap() else {
            output.error("mic_unavailable", "No microphone was found.")
            return
        }
        do {
            try engine.start()
            running = true
            output.send(["type": "mic_started"])
        } catch {
            output.error("mic_unavailable", "Could not start the microphone: \(error.localizedDescription)")
        }
    }

    /// (Re)installs the tap when the input format changed, e.g. after switching to AirPods.
    private func installTap() -> Bool {
        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0 else { return false }
        if let tapFormat, tapFormat == format { return true }
        if tapFormat != nil { input.removeTap(onBus: 0) }
        guard let converter = AVAudioConverter(from: format, to: Self.target) else { return false }
        self.converter = converter
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            self?.queue.async { self?.convert(buffer) }
        }
        tapFormat = format
        return true
    }

    private func denied() {
        output.error(
            "mic_denied",
            "Microphone access is off. Allow SUBXVoice in System Settings → Privacy & Security → Microphone."
        )
    }

    private func convert(_ buffer: AVAudioPCMBuffer) {
        guard let converter else { return }
        let ratio = Self.target.sampleRate / buffer.format.sampleRate
        let capacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio) + 32
        guard let converted = AVAudioPCMBuffer(pcmFormat: Self.target, frameCapacity: capacity) else { return }
        var supplied = false
        var error: NSError?
        converter.convert(to: converted, error: &error) { _, status in
            if supplied {
                status.pointee = .noDataNow
                return nil
            }
            supplied = true
            status.pointee = .haveData
            return buffer
        }
        guard error == nil, let channel = converted.int16ChannelData else { return }
        pending.append(contentsOf: UnsafeBufferPointer(start: channel[0], count: Int(converted.frameLength)))
        while pending.count >= Self.chunkSamples {
            emit(Array(pending.prefix(Self.chunkSamples)))
            pending.removeFirst(Self.chunkSamples)
        }
    }

    private func flush() {
        if !pending.isEmpty { emit(pending) }
        pending.removeAll()
    }

    private func emit(_ samples: [Int16]) {
        var sumSquares = 0.0
        for sample in samples {
            let value = Double(sample) / 32768
            sumSquares += value * value
        }
        var message: [String: Any] = [
            "type": "audio",
            "data": samples.withUnsafeBufferPointer { Data(buffer: $0) }.base64EncodedString(),
            "level": (sumSquares / Double(samples.count)).squareRoot(),
        ]
        if reportLatency {
            reportLatency = false
            message["latencyMs"] = Int(Date().timeIntervalSince(startedAt) * 1000)
        }
        output.send(message)
    }
}
