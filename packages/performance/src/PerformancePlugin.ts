import { ConfigManager, PerformanceConfig as ConfigPerformanceConfig, SamplingConfig } from '@observability/config';
import {
  Plugin,
  PluginContext,
  ObservabilityEvent,
} from '@observability/core';
import { PerformanceConfig, PerformanceProcessor } from './types';
import { AppLaunchTracker } from './trackers/AppLaunchTracker';
import { ANRDetector } from './trackers/ANRDetector';
import { AppLatencyTracker } from './trackers/AppLatencyTracker';
import { TimestampProcessor } from './processors/TimestampProcessor';
import { SamplingProcessor } from './processors/SamplingProcessor';

export class PerformancePlugin implements Plugin {
  readonly name = 'performance';
  readonly version = '1.0.0';

  private launchTracker: AppLaunchTracker | null = null;
  private anrDetector: ANRDetector | null = null;
  private latencyTracker: AppLatencyTracker | null = null;
  private processors: PerformanceProcessor[] = [];

  getLaunchTracker(): AppLaunchTracker {
    if (!this.launchTracker) {
      throw new Error('PerformancePlugin not initialized. Register it with the SDK first.');
    }
    return this.launchTracker;
  }

  getANRDetector(): ANRDetector {
    if (!this.anrDetector) {
      throw new Error('PerformancePlugin not initialized. Register it with the SDK first.');
    }
    return this.anrDetector;
  }

  getLatencyTracker(): AppLatencyTracker {
    if (!this.latencyTracker) {
      throw new Error('PerformancePlugin not initialized. Register it with the SDK first.');
    }
    return this.latencyTracker;
  }

  async initialize(context: PluginContext): Promise<void> {
    const configManager = ConfigManager.getInstance();
    const perfConfig = this.resolveConfig(configManager);
    const samplingConfig = configManager.getConfig().sampling;

    // Build processor pipeline
    this.processors = [
      new TimestampProcessor(),
      new SamplingProcessor(samplingConfig),
    ];

    const emitOptions = {
      processors: this.processors,
      emit: (event: ObservabilityEvent) => context.emit(event),
      sessionId: context.getSessionId(),
      enableConsole: perfConfig.enableConsole,
    };

    // Initialize launch tracker
    if (perfConfig.enableLaunchTracking) {
      this.launchTracker = new AppLaunchTracker({
        config: perfConfig.launch,
        ...emitOptions,
      });
      this.launchTracker.startMonitoring();
    }

    // Initialize ANR detector
    if (perfConfig.enableANRDetection) {
      this.anrDetector = new ANRDetector({
        config: perfConfig.anr,
        ...emitOptions,
      });
      this.anrDetector.start();
    }

    // Initialize latency tracker
    if (perfConfig.enableLatencyTracking) {
      this.latencyTracker = new AppLatencyTracker({
        config: perfConfig.latency,
        ...emitOptions,
      });
    }

    // Listen for sampling config changes
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
    // Pass through - performance doesn't filter SDK events
    return event;
  }

  async shutdown(): Promise<void> {
    if (this.launchTracker) {
      this.launchTracker.stopMonitoring();
      this.launchTracker = null;
    }

    if (this.anrDetector) {
      this.anrDetector.stop();
      this.anrDetector = null;
    }

    if (this.latencyTracker) {
      this.latencyTracker.cancelAll();
      this.latencyTracker = null;
    }
  }

  private resolveConfig(configManager: ConfigManager): PerformanceConfig {
    return configManager.getPackageConfig('performance') as ConfigPerformanceConfig;
  }
}
