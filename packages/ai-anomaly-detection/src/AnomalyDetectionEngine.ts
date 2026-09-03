import { ObservabilityEvent, PluginContext } from '@observability/core';
import {
  AnomalyDetectionConfig,
  AnomalyAlert,
  AnomalyEventData,
  MetricSnapshot,
} from './types';
import { MetricCollector } from './collectors/MetricCollector';
import { StatisticalDetector } from './detectors/StatisticalDetector';
import { AIDetector } from './detectors/AIDetector';
import { ThrottleProcessor } from './processors/ThrottleProcessor';
import { DeduplicationProcessor } from './processors/DeduplicationProcessor';

export class AnomalyDetectionEngine {
  private readonly config: AnomalyDetectionConfig;
  private readonly context: PluginContext;

  private readonly collector: MetricCollector;
  private readonly statisticalDetector: StatisticalDetector;
  private readonly aiDetector: AIDetector;
  private readonly throttle: ThrottleProcessor;
  private readonly dedup: DeduplicationProcessor;

  private evaluationTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: AnomalyDetectionConfig, context: PluginContext) {
    this.config = config;
    this.context = context;

    this.collector = new MetricCollector(
      config.windowSizeMs,
      config.maxWindows,
      config.monitoredEventTypes,
    );

    this.statisticalDetector = new StatisticalDetector(config.sensitivityThreshold);
    this.aiDetector = new AIDetector(config.apiKey, config.model);
    this.throttle = new ThrottleProcessor(config.aiCooldownMs);
    this.dedup = new DeduplicationProcessor();
  }

  start(): void {
    this.evaluationTimer = setInterval(() => {
      this.evaluate();
    }, this.config.evaluationIntervalMs);
  }

  stop(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = null;
    }
  }

  ingest(event: ObservabilityEvent): void {
    this.collector.ingest(event);
  }

  async evaluate(): Promise<void> {
    const snapshot = this.collector.getSnapshot();
    if (!snapshot) {
      return;
    }

    // Step 1: Statistical detection
    const anomalies = this.statisticalDetector.evaluate(snapshot, this.collector);
    if (anomalies.length === 0) {
      return;
    }

    if (this.config.enableConsole) {
      console.log(
        `[ai-anomaly-detection] Detected ${anomalies.length} anomalies`,
        anomalies.map((a) => `${a.anomalyType}:${a.metricName}`),
      );
    }

    // Step 2: Throttle
    const batch = this.throttle.enqueue(anomalies, snapshot);
    if (!batch) {
      return;
    }

    // Step 3: AI analysis (if available)
    const aiResult = await this.aiDetector.analyze(batch.anomalies, batch.snapshot);

    // Step 4: Build alerts
    const alerts: AnomalyAlert[] = batch.anomalies.map((anomaly) => ({
      anomaly,
      aiResult,
      detectionMode: aiResult ? 'statistical+ai' as const : 'statistical-only' as const,
    }));

    // Step 5: Deduplicate
    const uniqueAlerts = this.dedup.filter(alerts);

    // Step 6: Emit events
    for (const alert of uniqueAlerts) {
      this.emitAnomalyEvent(alert, snapshot);
    }
  }

  private emitAnomalyEvent(alert: AnomalyAlert, _snapshot: MetricSnapshot): void {
    const severity = this.mapSeverity(alert);

    const eventData: AnomalyEventData = {
      anomalyType: alert.anomaly.anomalyType,
      metricName: alert.anomaly.metricName,
      currentValue: alert.anomaly.currentValue,
      baselineMean: alert.anomaly.baselineMean,
      zScore: alert.anomaly.zScore,
      aiExplanation: alert.aiResult?.explanation ?? null,
      aiSeverity: alert.aiResult?.severity ?? null,
      aiRootCause: alert.aiResult?.rootCause ?? null,
      aiRecommendations: alert.aiResult?.recommendations ?? null,
      detectionMode: alert.detectionMode,
    };

    const event: ObservabilityEvent<AnomalyEventData> = {
      id: this.context.generateId(),
      type: 'custom',
      severity,
      timestamp: Date.now(),
      sessionId: this.context.getSessionId(),
      data: eventData,
      tags: { source: 'ai-anomaly-detection' },
    };

    this.context.emit(event as unknown as ObservabilityEvent);

    if (this.config.enableConsole) {
      console.log(`[ai-anomaly-detection] Alert emitted:`, {
        anomalyType: alert.anomaly.anomalyType,
        metric: alert.anomaly.metricName,
        zScore: alert.anomaly.zScore.toFixed(2),
        mode: alert.detectionMode,
      });
    }
  }

  private mapSeverity(alert: AnomalyAlert): 'warn' | 'error' | 'fatal' {
    // Use AI severity if available
    if (alert.aiResult?.severity) {
      switch (alert.aiResult.severity) {
        case 'critical':
          return 'fatal';
        case 'high':
          return 'error';
        default:
          return 'warn';
      }
    }

    // Fall back to z-score based severity
    const absZ = Math.abs(alert.anomaly.zScore);
    if (absZ > 5) return 'fatal';
    if (absZ > 4) return 'error';
    return 'warn';
  }
}
