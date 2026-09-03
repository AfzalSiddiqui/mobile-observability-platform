import { AIDetector } from '../detectors/AIDetector';
import { DetectedAnomaly, MetricSnapshot } from '../types';

const mockSnapshot: MetricSnapshot = {
  errorCount: 15,
  totalEventCount: 100,
  avgPerformanceDuration: 250,
  perTypeCount: { error: 15, log: 80, performance: 5 },
  windowStart: 1000,
  windowEnd: 61000,
};

const mockAnomalies: DetectedAnomaly[] = [
  {
    anomalyType: 'error_rate_spike',
    metricName: 'error_count',
    currentValue: 15,
    baselineMean: 3,
    zScore: 4.0,
    timestamp: 1000,
  },
];

const mockAIResponse = {
  explanation: 'Significant increase in error rate detected',
  severity: 'high',
  rootCause: 'Possible API endpoint failure',
  recommendations: ['Check API health', 'Review recent deployments'],
};

describe('AIDetector', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return null when no API key is configured', async () => {
    const detector = new AIDetector(undefined, 'claude-sonnet-4-20250514');
    const result = await detector.analyze(mockAnomalies, mockSnapshot);
    expect(result).toBeNull();
  });

  it('should report not available when no API key', () => {
    const detector = new AIDetector(undefined, 'claude-sonnet-4-20250514');
    expect(detector.isAvailable()).toBe(false);
  });

  it('should call Claude API and parse response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          content: [{ text: JSON.stringify(mockAIResponse) }],
        }),
    });

    const detector = new AIDetector('test-api-key', 'claude-sonnet-4-20250514');
    const result = await detector.analyze(mockAnomalies, mockSnapshot);

    expect(result).toEqual(mockAIResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test-api-key',
        }),
      }),
    );
  });

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const detector = new AIDetector('test-api-key', 'claude-sonnet-4-20250514');
    const result = await detector.analyze(mockAnomalies, mockSnapshot);

    expect(result).toBeNull();
  });

  it('should trip circuit breaker after 3 consecutive failures', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const detector = new AIDetector('test-api-key', 'claude-sonnet-4-20250514');

    // 3 failures
    await detector.analyze(mockAnomalies, mockSnapshot);
    await detector.analyze(mockAnomalies, mockSnapshot);
    await detector.analyze(mockAnomalies, mockSnapshot);

    // Circuit should now be open - fetch should not be called again
    const fetchCallCount = (global.fetch as jest.Mock).mock.calls.length;
    const result = await detector.analyze(mockAnomalies, mockSnapshot);

    expect(result).toBeNull();
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCallCount);
  });

  it('should handle non-JSON AI response gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          content: [{ text: 'This is a plain text response from AI' }],
        }),
    });

    const detector = new AIDetector('test-api-key', 'claude-sonnet-4-20250514');
    const result = await detector.analyze(mockAnomalies, mockSnapshot);

    expect(result).not.toBeNull();
    expect(result!.explanation).toBe('This is a plain text response from AI');
    expect(result!.severity).toBe('medium');
  });

  it('should handle empty API response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [] }),
    });

    const detector = new AIDetector('test-api-key', 'claude-sonnet-4-20250514');
    const result = await detector.analyze(mockAnomalies, mockSnapshot);

    expect(result).toBeNull();
  });

  it('should reset circuit breaker', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Error',
    });

    const detector = new AIDetector('test-api-key', 'claude-sonnet-4-20250514');

    // Trip circuit breaker
    await detector.analyze(mockAnomalies, mockSnapshot);
    await detector.analyze(mockAnomalies, mockSnapshot);
    await detector.analyze(mockAnomalies, mockSnapshot);

    expect(detector.isAvailable()).toBe(false);

    // Reset
    detector.reset();
    expect(detector.isAvailable()).toBe(true);
  });
});
