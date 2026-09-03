import { ObservabilityEvent } from '@observability/core';
import { MetricCollector } from '../collectors/MetricCollector';
import { MetricWindow } from '../collectors/MetricWindow';

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

describe('MetricWindow', () => {
  it('should track event counts', () => {
    const window = new MetricWindow(0, 60000);
    window.ingest(makeEvent({ type: 'log' }));
    window.ingest(makeEvent({ type: 'error' }));
    window.ingest(makeEvent({ type: 'log' }));

    const snapshot = window.getSnapshot();
    expect(snapshot.totalEventCount).toBe(3);
    expect(snapshot.errorCount).toBe(1);
  });

  it('should track per-type counts', () => {
    const window = new MetricWindow(0, 60000);
    window.ingest(makeEvent({ type: 'log' }));
    window.ingest(makeEvent({ type: 'log' }));
    window.ingest(makeEvent({ type: 'error' }));
    window.ingest(makeEvent({ type: 'performance', data: { duration: 100 } }));

    const snapshot = window.getSnapshot();
    expect(snapshot.perTypeCount.log).toBe(2);
    expect(snapshot.perTypeCount.error).toBe(1);
    expect(snapshot.perTypeCount.performance).toBe(1);
  });

  it('should track performance durations', () => {
    const window = new MetricWindow(0, 60000);
    window.ingest(makeEvent({ type: 'performance', data: { duration: 100 } }));
    window.ingest(makeEvent({ type: 'performance', data: { duration: 200 } }));

    const snapshot = window.getSnapshot();
    expect(snapshot.avgPerformanceDuration).toBe(150);
  });

  it('should return NaN for avg duration when no performance events', () => {
    const window = new MetricWindow(0, 60000);
    window.ingest(makeEvent({ type: 'log' }));

    const snapshot = window.getSnapshot();
    expect(isNaN(snapshot.avgPerformanceDuration)).toBe(true);
  });

  it('should count error and crash types as errors', () => {
    const window = new MetricWindow(0, 60000);
    window.ingest(makeEvent({ type: 'error' }));
    window.ingest(makeEvent({ type: 'crash' }));

    const snapshot = window.getSnapshot();
    expect(snapshot.errorCount).toBe(2);
  });
});

describe('MetricCollector', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should filter events by monitored types', () => {
    const collector = new MetricCollector(60000, 10, ['error', 'log']);

    collector.ingest(makeEvent({ type: 'log', timestamp: 1000 }));
    collector.ingest(makeEvent({ type: 'navigation', timestamp: 1000 }));

    const snapshot = collector.getSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot!.totalEventCount).toBe(1);
  });

  it('should return null snapshot when no events ingested', () => {
    const collector = new MetricCollector(60000, 10, ['log']);
    expect(collector.getSnapshot()).toBeNull();
  });

  it('should rotate windows when time exceeds window size', () => {
    const collector = new MetricCollector(1000, 10, ['log', 'error']);

    // Events in first window
    jest.setSystemTime(100);
    collector.ingest(makeEvent({ type: 'log', timestamp: 100 }));
    collector.ingest(makeEvent({ type: 'error', timestamp: 200 }));

    // Advance past first window
    jest.setSystemTime(1200);
    collector.ingest(makeEvent({ type: 'log', timestamp: 1200 }));

    expect(collector.getCompletedWindowCount()).toBe(1);
  });

  it('should compute baseline from completed windows', () => {
    const collector = new MetricCollector(1000, 10, ['log', 'error']);

    // Window 1: 2 errors
    jest.setSystemTime(100);
    collector.ingest(makeEvent({ type: 'error', timestamp: 100 }));
    collector.ingest(makeEvent({ type: 'error', timestamp: 200 }));

    // Rotate to window 2: 4 errors
    jest.setSystemTime(1200);
    collector.ingest(makeEvent({ type: 'error', timestamp: 1200 }));
    collector.ingest(makeEvent({ type: 'error', timestamp: 1300 }));
    collector.ingest(makeEvent({ type: 'error', timestamp: 1400 }));
    collector.ingest(makeEvent({ type: 'error', timestamp: 1500 }));

    // Rotate to window 3
    jest.setSystemTime(2300);
    collector.ingest(makeEvent({ type: 'log', timestamp: 2300 }));

    // Baseline from windows 1 (2 errors) and 2 (4 errors)
    const baseline = collector.getBaseline((s) => s.errorCount);
    expect(baseline.sampleCount).toBe(2);
    expect(baseline.mean).toBe(3); // (2 + 4) / 2
    expect(baseline.stddev).toBe(1); // sqrt(((2-3)^2 + (4-3)^2) / 2) = sqrt(1) = 1
  });

  it('should evict oldest windows when exceeding maxWindows', () => {
    const collector = new MetricCollector(1000, 2, ['log']);

    // Create 3 completed windows
    for (let i = 0; i < 4; i++) {
      const t = i * 1100;
      jest.setSystemTime(t);
      collector.ingest(makeEvent({ type: 'log', timestamp: t }));
    }

    // Should only have 2 completed windows
    expect(collector.getCompletedWindowCount()).toBe(2);
  });
});
