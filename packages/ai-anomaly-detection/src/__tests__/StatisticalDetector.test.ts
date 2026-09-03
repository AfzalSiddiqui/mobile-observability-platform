import { ObservabilityEvent } from '@observability/core';
import { StatisticalDetector } from '../detectors/StatisticalDetector';
import { MetricCollector } from '../collectors/MetricCollector';

function makeEvent(
  overrides: Partial<ObservabilityEvent> = {},
): ObservabilityEvent {
  return {
    id: 'test-id',
    type: 'log',
    severity: 'info',
    timestamp: Date.now(),
    sessionId: 'session-1',
    data: {},
    ...overrides,
  };
}

describe('StatisticalDetector', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return no anomalies when there is no baseline', () => {
    const detector = new StatisticalDetector(2.5);
    const collector = new MetricCollector(1000, 10, ['log', 'error']);

    jest.setSystemTime(100);
    collector.ingest(makeEvent({ type: 'log', timestamp: 100 }));

    const snapshot = collector.getSnapshot()!;
    const anomalies = detector.evaluate(snapshot, collector);

    expect(anomalies).toEqual([]);
  });

  it('should detect error rate spike', () => {
    const detector = new StatisticalDetector(2.0);
    const collector = new MetricCollector(1000, 10, ['log', 'error']);

    // Build baseline: 1 error per window over 4 windows
    for (let i = 0; i < 4; i++) {
      const t = i * 1100;
      jest.setSystemTime(t);
      collector.ingest(makeEvent({ type: 'error', timestamp: t }));
    }

    // Current window: spike of 10 errors
    const currentTime = 4 * 1100;
    jest.setSystemTime(currentTime);
    for (let i = 0; i < 10; i++) {
      collector.ingest(makeEvent({ type: 'error', timestamp: currentTime + i }));
    }

    const snapshot = collector.getSnapshot()!;
    const anomalies = detector.evaluate(snapshot, collector);

    const errorAnomaly = anomalies.find((a) => a.anomalyType === 'error_rate_spike');
    expect(errorAnomaly).toBeDefined();
    expect(errorAnomaly!.currentValue).toBe(10);
    expect(errorAnomaly!.zScore).toBeGreaterThan(2.0);
  });

  it('should not flag anomaly when values are within threshold', () => {
    const detector = new StatisticalDetector(2.5);
    const collector = new MetricCollector(1000, 10, ['log']);

    // Build baseline: ~5 events per window
    for (let i = 0; i < 5; i++) {
      const t = i * 1100;
      jest.setSystemTime(t);
      for (let j = 0; j < 5; j++) {
        collector.ingest(makeEvent({ type: 'log', timestamp: t + j }));
      }
    }

    // Current window: 6 events (slight increase, within threshold)
    const currentTime = 5 * 1100;
    jest.setSystemTime(currentTime);
    for (let i = 0; i < 6; i++) {
      collector.ingest(makeEvent({ type: 'log', timestamp: currentTime + i }));
    }

    const snapshot = collector.getSnapshot()!;
    const anomalies = detector.evaluate(snapshot, collector);

    // Should not flag traffic_surge for slight increase
    const trafficAnomaly = anomalies.find((a) => a.anomalyType === 'traffic_surge');
    expect(trafficAnomaly).toBeUndefined();
  });

  it('should detect latency degradation', () => {
    const detector = new StatisticalDetector(2.0);
    const collector = new MetricCollector(1000, 10, ['performance']);

    // Build baseline: avg 100ms performance
    for (let i = 0; i < 4; i++) {
      const t = i * 1100;
      jest.setSystemTime(t);
      collector.ingest(
        makeEvent({ type: 'performance', timestamp: t, data: { duration: 100 } }),
      );
    }

    // Current window: 500ms (spike)
    const currentTime = 4 * 1100;
    jest.setSystemTime(currentTime);
    collector.ingest(
      makeEvent({
        type: 'performance',
        timestamp: currentTime,
        data: { duration: 500 },
      }),
    );

    const snapshot = collector.getSnapshot()!;
    const anomalies = detector.evaluate(snapshot, collector);

    const latencyAnomaly = anomalies.find(
      (a) => a.anomalyType === 'latency_degradation',
    );
    expect(latencyAnomaly).toBeDefined();
    expect(latencyAnomaly!.currentValue).toBe(500);
  });

  it('should use cold start heuristic when less than 3 windows', () => {
    const detector = new StatisticalDetector(2.0);
    const collector = new MetricCollector(1000, 10, ['error']);

    // Build baseline: 1 window with 2 errors
    jest.setSystemTime(100);
    collector.ingest(makeEvent({ type: 'error', timestamp: 100 }));
    collector.ingest(makeEvent({ type: 'error', timestamp: 200 }));

    // Rotate to window 2: spike of 20 errors
    jest.setSystemTime(1200);
    for (let i = 0; i < 20; i++) {
      collector.ingest(makeEvent({ type: 'error', timestamp: 1200 + i }));
    }

    // Only 1 completed window (cold start)
    expect(collector.getCompletedWindowCount()).toBe(1);

    const snapshot = collector.getSnapshot()!;
    const anomalies = detector.evaluate(snapshot, collector);

    // Should still detect with cold start heuristic
    const errorAnomaly = anomalies.find((a) => a.anomalyType === 'error_rate_spike');
    expect(errorAnomaly).toBeDefined();
  });
});
