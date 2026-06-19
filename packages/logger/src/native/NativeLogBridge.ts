export interface NativeLogEntry {
  message: string;
  level: string;
  tag?: string;
  timestamp?: number;
}

type NativeLogCallback = (entry: NativeLogEntry) => void;

/**
 * Bridge to native logging modules.
 * Attempts TurboModule first, falls back to legacy NativeModules.
 */
export class NativeLogBridge {
  private nativeModule: Record<string, unknown> | null = null;
  private eventSubscription: { remove(): void } | null = null;
  private callback: NativeLogCallback | null = null;

  constructor() {
    this.nativeModule = this.loadNativeModule();
  }

  startCapture(callback: NativeLogCallback): void {
    this.callback = callback;

    if (!this.nativeModule) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { NativeEventEmitter } = require('react-native');
      const emitter = new NativeEventEmitter(this.nativeModule);
      this.eventSubscription = emitter.addListener(
        'ObservabilityNativeLog',
        (event: NativeLogEntry) => {
          if (this.callback) {
            this.callback(event);
          }
        },
      );

      (this.nativeModule as { startCapture: (opts: { level: string }) => void })
        .startCapture({ level: 'info' });
    } catch {
      // Native module not available
    }
  }

  stopCapture(): void {
    this.callback = null;

    if (this.eventSubscription) {
      this.eventSubscription.remove();
      this.eventSubscription = null;
    }

    if (this.nativeModule) {
      try {
        (this.nativeModule as { stopCapture: () => void }).stopCapture();
      } catch {
        // Best effort
      }
    }
  }

  isAvailable(): boolean {
    return this.nativeModule !== null;
  }

  private loadNativeModule(): Record<string, unknown> | null {
    // Try TurboModule (New Architecture)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { TurboModuleRegistry } = require('react-native');
      const turboModule = TurboModuleRegistry.get('ObservabilityLogger');
      if (turboModule) return turboModule as Record<string, unknown>;
    } catch {
      // TurboModule not available
    }

    // Fall back to legacy NativeModules (Old Architecture)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { NativeModules } = require('react-native');
      if (NativeModules.ObservabilityLogger) {
        return NativeModules.ObservabilityLogger as Record<string, unknown>;
      }
    } catch {
      // react-native not available
    }

    return null;
  }
}
