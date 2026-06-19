package com.observability.logger;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class ObservabilityLoggerModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "ObservabilityLogger";
    private static final String EVENT_NAME = "ObservabilityNativeLog";

    private final ReactApplicationContext reactContext;
    private final ExecutorService executorService;
    private final AtomicBoolean isCapturing = new AtomicBoolean(false);
    private LogCapture logCapture;

    public ObservabilityLoggerModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        this.executorService = Executors.newSingleThreadExecutor();
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void startCapture(@Nullable ReadableMap options) {
        if (isCapturing.compareAndSet(false, true)) {
            String level = options != null && options.hasKey("level")
                ? options.getString("level")
                : "info";

            logCapture = new LogCapture(level);
            executorService.execute(() -> {
                logCapture.start(entry -> {
                    if (isCapturing.get()) {
                        sendEvent(entry);
                    }
                });
            });
        }
    }

    @ReactMethod
    public void stopCapture() {
        if (isCapturing.compareAndSet(true, false)) {
            if (logCapture != null) {
                logCapture.stop();
                logCapture = null;
            }
        }
    }

    @ReactMethod
    public void addListener(String eventName) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    public void removeListeners(int count) {
        // Required for NativeEventEmitter
    }

    private void sendEvent(LogCapture.LogEntry entry) {
        if (!reactContext.hasActiveReactInstance()) return;

        WritableMap params = Arguments.createMap();
        params.putString("message", entry.message);
        params.putString("level", entry.level);
        params.putString("tag", entry.tag);
        params.putDouble("timestamp", System.currentTimeMillis());

        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(EVENT_NAME, params);
    }
}
