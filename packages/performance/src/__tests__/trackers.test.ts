import { AppLatencyTracker } from '../trackers/AppLatencyTracker';
import { AppLaunchTracker } from '../trackers/AppLaunchTracker';

describe('performance trackers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('reports slow latency operations to the SDK emitter', () => {
    const emit = jest.fn();
    const tracker = new AppLatencyTracker({
      config: { slowOperationThreshold: 100, maxConcurrentSpans: 2 },
      emit,
      sessionId: 'session-1',
    });
    const span = tracker.startSpan('refresh_health', { tags: { screen: 'health' } });
    jest.advanceTimersByTime(150);

    expect(tracker.endSpan(span, { status: 200 })).toBe(150);
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({
      type: 'performance', severity: 'warn', sessionId: 'session-1',
      data: expect.objectContaining({ name: 'refresh_health', isSlow: true, status: 200 }),
      tags: { screen: 'health', slow: 'true' },
    }));
  });

  it('reports a cold-launch metric only once', () => {
    const emit = jest.fn();
    const tracker = new AppLaunchTracker({
      config: { coldLaunchThreshold: 100, hotLaunchThreshold: 100 },
      emit,
      sessionId: 'session-1',
    });
    jest.advanceTimersByTime(120);
    tracker.reportColdLaunchEnd();
    tracker.reportColdLaunchEnd();

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'warn',
      data: expect.objectContaining({ metricType: 'cold_launch', isSlow: true }),
    }));
  });
});
