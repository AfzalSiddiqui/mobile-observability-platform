import Foundation
import os

@objc public class LogCaptureSwift: NSObject {

    @objc public static let shared = LogCaptureSwift()
    private var isCapturing = false
    private var callback: ((String, String, String) -> Void)?
    private let queue = DispatchQueue(label: "com.observability.logcapture", qos: .utility)

    private override init() {
        super.init()
    }

    @objc public func start(callback: @escaping (String, String, String) -> Void) {
        self.callback = callback
        isCapturing = true
        startCapture()
    }

    @objc public func stop() {
        isCapturing = false
        callback = nil
    }

    private func startCapture() {
        queue.async { [weak self] in
            guard let self = self else { return }

            if #available(iOS 15.0, *) {
                self.captureViaOSLogStore()
            } else {
                self.captureViaStderr()
            }
        }
    }

    @available(iOS 15.0, *)
    private func captureViaOSLogStore() {
        do {
            let store = try OSLogStore(scope: .currentProcessIdentifier)
            let position = store.position(timeIntervalSinceLatestBoot: 0)
            let entries = try store.getEntries(at: position)

            for entry in entries {
                guard isCapturing else { break }
                if let logEntry = entry as? OSLogEntryLog {
                    let level = mapOSLogLevel(logEntry.level)
                    callback?(logEntry.composedMessage, level, logEntry.subsystem)
                }
            }
        } catch {
            // Fall back to stderr capture on failure
            captureViaStderr()
        }
    }

    private func captureViaStderr() {
        // Stderr-based fallback for iOS < 15
        // Redirects stderr to a pipe and reads log output
        let pipe = Pipe()
        let originalStderr = dup(STDERR_FILENO)
        dup2(pipe.fileHandleForWriting.fileDescriptor, STDERR_FILENO)

        pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            guard let self = self, self.isCapturing else {
                // Restore stderr
                dup2(originalStderr, STDERR_FILENO)
                close(originalStderr)
                handle.readabilityHandler = nil
                return
            }

            let data = handle.availableData
            if !data.isEmpty, let message = String(data: data, encoding: .utf8) {
                self.callback?(message.trimmingCharacters(in: .whitespacesAndNewlines), "info", "stderr")
            }
        }
    }

    @available(iOS 15.0, *)
    private func mapOSLogLevel(_ level: OSLogEntryLog.Level) -> String {
        switch level {
        case .debug: return "debug"
        case .info: return "info"
        case .notice: return "info"
        case .error: return "error"
        case .fault: return "fatal"
        default: return "info"
        }
    }
}
