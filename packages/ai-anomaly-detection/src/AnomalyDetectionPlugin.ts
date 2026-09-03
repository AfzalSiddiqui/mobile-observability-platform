import { ConfigManager } from '@observability/config';
import { Plugin, PluginContext, ObservabilityEvent } from '@observability/core';
import { AnomalyDetectionConfig, DEFAULT_ANOMALY_DETECTION_CONFIG } from './types';
import { AnomalyDetectionEngine } from './AnomalyDetectionEngine';

export class AnomalyDetectionPlugin implements Plugin {
  readonly name = 'ai-anomaly-detection';
  readonly version = '1.0.0';

  private engine: AnomalyDetectionEngine | null = null;

  async initialize(context: PluginContext): Promise<void> {
    const configManager = ConfigManager.getInstance();

    let config: AnomalyDetectionConfig;
    try {
      const raw = configManager.getPackageConfig('ai-anomaly-detection') as Partial<AnomalyDetectionConfig>;
      config = { ...DEFAULT_ANOMALY_DETECTION_CONFIG, ...raw };
    } catch {
      config = { ...DEFAULT_ANOMALY_DETECTION_CONFIG };
    }

    this.engine = new AnomalyDetectionEngine(config, context);
    this.engine.start();
  }

  onEvent(event: ObservabilityEvent): ObservabilityEvent {
    if (this.engine) {
      this.engine.ingest(event);
    }
    return event;
  }

  async shutdown(): Promise<void> {
    if (this.engine) {
      this.engine.stop();
      this.engine = null;
    }
  }
}
