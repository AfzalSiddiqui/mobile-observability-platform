import { ConfigManager, LoggerConfig, SamplingConfig } from '@observability/config';
import {
  Plugin,
  PluginContext,
  ObservabilityEvent,
  EventBus,
  ObservabilitySDK,
} from '@observability/core';
import { Logger } from './Logger';
import { LogProcessor } from './types';
import { TimestampProcessor } from './processors/TimestampProcessor';
import { SamplingProcessor } from './processors/SamplingProcessor';
import { SanitizationProcessor } from './processors/SanitizationProcessor';
import { ConsoleFormatter } from './formatters/ConsoleFormatter';
import { BreadcrumbManager } from './breadcrumbs/BreadcrumbManager';
import { NativeLogBridge } from './native/NativeLogBridge';

export class LoggerPlugin implements Plugin {
  readonly name = 'logger';
  readonly version = '1.0.0';

  private logger: Logger | null = null;
  private breadcrumbManager: BreadcrumbManager | null = null;
  private nativeBridge: NativeLogBridge | null = null;
  private processors: LogProcessor[] = [];

  getLogger(): Logger {
    if (!this.logger) {
      throw new Error('LoggerPlugin not initialized. Register it with the SDK first.');
    }
    return this.logger;
  }

  getBreadcrumbManager(): BreadcrumbManager {
    if (!this.breadcrumbManager) {
      throw new Error('LoggerPlugin not initialized.');
    }
    return this.breadcrumbManager;
  }

  async initialize(context: PluginContext): Promise<void> {
    const configManager = ConfigManager.getInstance();
    const loggerConfig = configManager.getPackageConfig('logger') as LoggerConfig;
    const samplingConfig = configManager.getConfig().sampling;

    this.breadcrumbManager = new BreadcrumbManager(loggerConfig.maxBreadcrumbs);

    // Build processor pipeline
    this.processors = [
      new TimestampProcessor(),
      new SamplingProcessor(samplingConfig),
      new SanitizationProcessor(loggerConfig.sensitiveFields),
    ];

    let eventBus: EventBus | undefined;
    try {
      eventBus = ObservabilitySDK.getInstance().getEventBus();
    } catch {
      // SDK might not be available in standalone use
    }

    this.logger = new Logger({
      config: loggerConfig,
      processors: this.processors,
      formatter: loggerConfig.enableConsole ? new ConsoleFormatter() : undefined,
      eventBus,
      sessionId: context.getSessionId(),
      breadcrumbManager: this.breadcrumbManager,
    });

    // Start native log capture if enabled
    if (loggerConfig.enableNativeCapture) {
      this.nativeBridge = new NativeLogBridge();
      this.nativeBridge.startCapture((nativeLog) => {
        this.logger?.info({
          message: nativeLog.message,
          context: { source: 'native', tag: nativeLog.tag },
        });
      });
    }

    // Listen for config changes
    configManager.onChange<SamplingConfig>('sampling', (newSampling) => {
      const samplingProc = this.processors.find(
        (p): p is SamplingProcessor => p.name === 'sampling',
      );
      if (samplingProc) {
        samplingProc.updateConfig(newSampling);
      }
    });
  }

  onEvent(event: ObservabilityEvent): ObservabilityEvent {
    // Pass through - logger doesn't filter SDK events
    return event;
  }

  async shutdown(): Promise<void> {
    if (this.nativeBridge) {
      this.nativeBridge.stopCapture();
      this.nativeBridge = null;
    }
    this.logger = null;
    this.breadcrumbManager = null;
  }
}
