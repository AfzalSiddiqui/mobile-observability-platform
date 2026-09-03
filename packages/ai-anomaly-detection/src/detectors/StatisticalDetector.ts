import { MetricSnapshot, BaselineStats, DetectedAnomaly, AnomalyType } from '../types';
import { MetricCollector } from '../collectors/MetricCollector';

interface MetricDefinition {
  name: string;
  anomalyTypeHigh: AnomalyType;
  anomalyTypeLow?: AnomalyType;
  extract: (snapshot: MetricSnapshot) => number;
}

const COLD_START_MIN_WINDOWS = 3;
const COLD_START_DEVIATION_FACTOR = 0.5;

export class StatisticalDetector {
  private readonly threshold: number;

  private static readonly METRICS: MetricDefinition[] = [
    {
      name: 'error_count',
      anomalyTypeHigh: 'error_rate_spike',
      extract: (s) => s.errorCount,
    },
    {
      name: 'total_event_count',
      anomalyTypeHigh: 'traffic_surge',
      anomalyTypeLow: 'traffic_drop',
      extract: (s) => s.totalEventCount,
    },
    {
      name: 'avg_performance_duration',
      anomalyTypeHigh: 'latency_degradation',
      extract: (s) => s.avgPerformanceDuration,
    },
  ];

  constructor(threshold: number) {
    this.threshold = threshold;
  }

  evaluate(snapshot: MetricSnapshot, collector: MetricCollector): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    for (const metric of StatisticalDetector.METRICS) {
      const currentValue = metric.extract(snapshot);
      if (isNaN(currentValue)) {
        continue;
      }

      const baseline = collector.getBaseline(metric.extract);
      const anomaly = this.checkMetric(
        currentValue,
        baseline,
        metric,
        collector.getCompletedWindowCount(),
        snapshot.windowStart,
      );

      if (anomaly) {
        anomalies.push(anomaly);
      }
    }

    // Check per-type event counts
    for (const [eventType, count] of Object.entries(snapshot.perTypeCount)) {
      if (count === undefined) continue;

      const extractor = (s: MetricSnapshot) => s.perTypeCount[eventType as keyof typeof s.perTypeCount] ?? 0;
      const baseline = collector.getBaseline(extractor);

      const anomaly = this.checkMetric(
        count,
        baseline,
        {
          name: `event_type_${eventType}`,
          anomalyTypeHigh: 'event_type_spike',
          anomalyTypeLow: 'event_type_drop',
          extract: extractor,
        },
        collector.getCompletedWindowCount(),
        snapshot.windowStart,
      );

      if (anomaly) {
        anomalies.push(anomaly);
      }
    }

    return anomalies;
  }

  private checkMetric(
    currentValue: number,
    baseline: BaselineStats,
    metric: MetricDefinition,
    completedWindows: number,
    timestamp: number,
  ): DetectedAnomaly | null {
    if (baseline.sampleCount === 0) {
      return null;
    }

    let zScore: number;

    if (completedWindows < COLD_START_MIN_WINDOWS) {
      // Cold start: use deviation heuristic
      const syntheticStddev = baseline.mean * COLD_START_DEVIATION_FACTOR || 1;
      zScore = (currentValue - baseline.mean) / syntheticStddev;
    } else {
      if (baseline.stddev === 0) {
        // All historical values identical; any deviation is anomalous
        zScore = currentValue === baseline.mean ? 0 : (currentValue > baseline.mean ? this.threshold + 1 : -(this.threshold + 1));
      } else {
        zScore = (currentValue - baseline.mean) / baseline.stddev;
      }
    }

    if (Math.abs(zScore) > this.threshold) {
      const anomalyType =
        zScore > 0
          ? metric.anomalyTypeHigh
          : metric.anomalyTypeLow ?? metric.anomalyTypeHigh;

      return {
        anomalyType,
        metricName: metric.name,
        currentValue,
        baselineMean: baseline.mean,
        zScore,
        timestamp,
      };
    }

    return null;
  }
}
