package com.observability.logger;

import android.util.Log;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Captures Android logcat output via Runtime.exec("logcat").
 * Uses AtomicBoolean for thread-safe start/stop.
 */
public class LogCapture {
    private static final String TAG = "ObservabilityLogCapture";

    private final AtomicBoolean isRunning = new AtomicBoolean(false);
    private final String minLevel;
    private Process logcatProcess;

    public interface LogCallback {
        void onLog(LogEntry entry);
    }

    public static class LogEntry {
        public final String message;
        public final String level;
        public final String tag;

        public LogEntry(String message, String level, String tag) {
            this.message = message;
            this.level = level;
            this.tag = tag;
        }
    }

    public LogCapture(String minLevel) {
        this.minLevel = minLevel != null ? minLevel : "info";
    }

    public void start(LogCallback callback) {
        if (!isRunning.compareAndSet(false, true)) {
            return;
        }

        try {
            String levelFlag = mapLevelToLogcatFlag(minLevel);
            logcatProcess = Runtime.getRuntime().exec(
                new String[]{"logcat", "-v", "brief", "*:" + levelFlag}
            );

            BufferedReader reader = new BufferedReader(
                new InputStreamReader(logcatProcess.getInputStream())
            );

            String line;
            while (isRunning.get() && (line = reader.readLine()) != null) {
                LogEntry entry = parseLine(line);
                if (entry != null && callback != null) {
                    callback.onLog(entry);
                }
            }

            reader.close();
        } catch (IOException e) {
            Log.e(TAG, "Failed to start logcat capture", e);
        } finally {
            isRunning.set(false);
        }
    }

    public void stop() {
        isRunning.set(false);
        if (logcatProcess != null) {
            logcatProcess.destroy();
            logcatProcess = null;
        }
    }

    private LogEntry parseLine(String line) {
        if (line == null || line.length() < 3) return null;

        char levelChar = line.charAt(0);
        String level = mapLogcatLevel(levelChar);
        String tag = "logcat";
        String message = line;

        // Parse "V/Tag: message" format
        int slashIndex = line.indexOf('/');
        int colonIndex = line.indexOf(':', slashIndex > 0 ? slashIndex : 0);
        if (slashIndex > 0 && colonIndex > slashIndex) {
            tag = line.substring(slashIndex + 1, colonIndex).trim();
            message = line.substring(colonIndex + 1).trim();
        }

        return new LogEntry(message, level, tag);
    }

    private String mapLogcatLevel(char level) {
        switch (level) {
            case 'V':
            case 'D': return "debug";
            case 'I': return "info";
            case 'W': return "warn";
            case 'E': return "error";
            case 'F':
            case 'A': return "fatal";
            default: return "info";
        }
    }

    private String mapLevelToLogcatFlag(String level) {
        switch (level) {
            case "debug": return "D";
            case "info": return "I";
            case "warn": return "W";
            case "error": return "E";
            case "fatal": return "F";
            default: return "I";
        }
    }
}
