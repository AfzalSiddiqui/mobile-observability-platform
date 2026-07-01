import { ConfigManager, AnalyticsConfig, SamplingConfig } from '@observability/config';
import {
  Plugin,
  PluginContext,
  ObservabilityEvent,
  EventBus,
  ObservabilitySDK,
} from '@observability/core';
import { Analytics } from './Analytics';
import { AnalyticsProcessor } from './types';
import { AnalyticsProvider } from './providers/AnalyticsProvider';
import { ConsoleProvider } from './providers/ConsoleProvider';
import { TimestampProcessor } from './processors/TimestampProcessor';
import { SamplingProcessor } from './processors/SamplingProcessor';
import { SanitizationProcessor } from './processors/SanitizationProcessor';
import { EnrichmentProcessor } from './processors/EnrichmentProcessor';

export class AnalyticsPlugin implements Plugin {
  readonly name = 'analytics';
  readonly version = '1.0.0';

  private analytics: Analytics | null = null;
  private processors: AnalyticsProcessor[] = [];
  private readonly externalProviders: AnalyticsProvider[];

  constructor(providers?: AnalyticsProvider[]) {
    this.externalProviders = providers ?? [];
  }

  getAnalytics(): Analytics {
    if (!this.analytics) {
      throw new Error('AnalyticsPlugin not initialized. Register it with the SDK first.');
    }
    return this.analytics;
  }

  async initialize(context: PluginContext): Promise<void> {
    const configManager = ConfigManager.getInstance();
    const analyticsConfig = configManager.getPackageConfig('analytics') as AnalyticsConfig;
    const samplingConfig = configManager.getConfig().sampling;

    // Build processor pipeline
    this.processors = [
      new TimestampProcessor(),
      new SamplingProcessor(samplingConfig),
      new SanitizationProcessor(analyticsConfig.sensitiveFields),
      new EnrichmentProcessor(analyticsConfig.defaultProperties),
    ];

    // Build provider list
    const providers: AnalyticsProvider[] = [...this.externalProviders];
    if (analyticsConfig.enableConsole) {
      providers.push(new ConsoleProvider());
    }

    // Initialize providers
    for (const provider of providers) {
      if (provider.initialize) {
        await provider.initialize();
      }
    }

    let eventBus: EventBus | undefined;
    try {
      eventBus = ObservabilitySDK.getInstance().getEventBus();
    } catch {
      // SDK might not be available in standalone use
    }

    this.analytics = new Analytics({
      processors: this.processors,
      providers,
      eventBus,
      sessionId: context.getSessionId(),
    });

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
    // Pass through - analytics doesn't filter SDK events
    return event;
  }

  async shutdown(): Promise<void> {
    if (this.analytics) {
      await this.analytics.flush();
    }
    this.analytics = null;
  }
}
