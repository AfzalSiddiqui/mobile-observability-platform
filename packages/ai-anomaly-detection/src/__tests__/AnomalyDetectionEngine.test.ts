import { ObservabilityEvent, PluginContext } from '@observability/core';
import { AnomalyDetectionEngine } from '../AnomalyDetectionEngine';
import { AnomalyDetectionConfig, DEFAULT_ANOMALY_DETECTION_CONFIG } from '../types';

function createMockContext(): PluginContext {
  return {
    emit: jest.fn(),
    getSessionId: () => 'test-session',
    generateId: () => 'test-id-' + Math.random().toString(36).slice(2, 8),
  };
}

function makeEvent(
  overrides: Partial<ObservabilityEvent> = {},
): ObservabilityEvent {
  return {
    id: 'evt-1',
    type: 'log',
    severity: 'info',
    timestamp: Date.now(),
    sessionId: 'session-1',
    data: {},
    ...overrides,
  };
}

describe('AnomalyDetectionEngine', () => {
  let config: AnomalyDetectionConfig;
  let context: PluginContext;

  beforeEach(() => {
    jest.useFakeTimers();
    config = {
      ...DEFAULT_ANOMALY_DETECTION_CONFIG,
      windowSizeMs: 1000,
      evaluationIntervalMs: 500,
      sensitivityThreshold: 2.0,
      aiCooldownMs: 0,
    };
    context = createMockContext();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start and stop evaluation timer', () => {
    const engine = new AnomalyDetectionEngine(config, context);

    engine.start();
    expect(jest.getTimerCount()).toBe(1);

    engine.stop();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('should ingest events without blocking', () => {
    const engine = new AnomalyDetectionEngine(config, context);
    engine.start();

    const event = makeEvent();
    // Should not throw
    engine.ingest(event);

    engine.stop();
  });

  it('should detect anomalies and emit events', async () => {
    const engine = new AnomalyDetectionEngine(config, context);

    // Build baseline: 1 error per window over 4 windows
    for (let i = 0; i < 4; i++) {
      const t = i * 1100;
      jest.setSystemTime(t);
      engine.ingest(makeEvent({ type: 'error', timestamp: t }));

      // Trigger window rotation
      jest.setSystemTime(t + 1100);
      engine.ingest(makeEvent({ type: 'log', timestamp: t + 1100 }));
    }

    // Current window: spike of 20 errors
    const spikeTime = 4 * 1100 + 100;
    jest.setSystemTime(spikeTime);
    for (let i = 0; i < 20; i++) {
      engine.ingest(makeEvent({ type: 'error', timestamp: spikeTime + i }));
    }

    // Run evaluation
    await engine.evaluate();

    // Should have emitted anomaly events
    expect(context.emit).toHaveBeenCalled();

    const emittedEvent = (context.emit as jest.Mock).mock.calls[0][0];
    expect(emittedEvent.type).toBe('custom');
    expect(emittedEvent.tags).toEqual({ source: 'ai-anomaly-detection' });
    expect(emittedEvent.data.anomalyType).toBeDefined();
    expect(emittedEvent.data.detectionMode).toBe('statistical-only');

    engine.stop();
  });

  it('should not emit when there are no anomalies', async () => {
    const engine = new AnomalyDetectionEngine(config, context);

    // Build baseline: 5 events per window
    for (let i = 0; i < 4; i++) {
      const t = i * 1100;
      jest.setSystemTime(t);
      for (let j = 0; j < 5; j++) {
        engine.ingest(makeEvent({ type: 'log', timestamp: t + j }));
      }
    }

    // Current window: same pattern
    const currentTime = 4 * 1100;
    jest.setSystemTime(currentTime);
    for (let i = 0; i < 5; i++) {
      engine.ingest(makeEvent({ type: 'log', timestamp: currentTime + i }));
    }

    await engine.evaluate();

    expect(context.emit).not.toHaveBeenCalled();

    engine.stop();
  });

  it('should not emit when no events have been ingested', async () => {
    const engine = new AnomalyDetectionEngine(config, context);

    await engine.evaluate();

    expect(context.emit).not.toHaveBeenCalled();

    engine.stop();
  });

  it('should run statistical-only mode without API key', async () => {
    // No apiKey = statistical-only
    const engine = new AnomalyDetectionEngine(config, context);

    // Build baseline and spike
    for (let i = 0; i < 4; i++) {
      const t = i * 1100;
      jest.setSystemTime(t);
      engine.ingest(makeEvent({ type: 'error', timestamp: t }));
    }

    const spikeTime = 4 * 1100 + 100;
    jest.setSystemTime(spikeTime);
    for (let i = 0; i < 30; i++) {
      engine.ingest(makeEvent({ type: 'error', timestamp: spikeTime + i }));
    }

    await engine.evaluate();

    const emittedEvent = (context.emit as jest.Mock).mock.calls[0]?.[0];
    if (emittedEvent) {
      expect(emittedEvent.data.detectionMode).toBe('statistical-only');
      expect(emittedEvent.data.aiExplanation).toBeNull();
    }

    engine.stop();
  });
});
