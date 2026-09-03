import { ObservabilityEvent, PluginContext } from '@observability/core';
import { ConfigManager } from '@observability/config';
import { AnomalyDetectionPlugin } from '../AnomalyDetectionPlugin';

function createMockContext(): PluginContext {
  return {
    emit: jest.fn(),
    getSessionId: () => 'test-session',
    generateId: () => 'test-id',
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

describe('AnomalyDetectionPlugin', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    ConfigManager.resetInstance();
    ConfigManager.getInstance().initialize({
      appId: 'test-app',
      appVersion: '1.0.0',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    ConfigManager.resetInstance();
  });

  it('should have correct name and version', () => {
    const plugin = new AnomalyDetectionPlugin();
    expect(plugin.name).toBe('ai-anomaly-detection');
    expect(plugin.version).toBe('1.0.0');
  });

  it('should initialize without errors', async () => {
    const plugin = new AnomalyDetectionPlugin();
    const context = createMockContext();

    await expect(plugin.initialize(context)).resolves.not.toThrow();
    await plugin.shutdown();
  });

  it('should pass through events unchanged in onEvent', async () => {
    const plugin = new AnomalyDetectionPlugin();
    const context = createMockContext();

    await plugin.initialize(context);

    const event = makeEvent();
    const result = plugin.onEvent(event);

    expect(result).toBe(event);
    await plugin.shutdown();
  });

  it('should return the same event reference (never blocks)', async () => {
    const plugin = new AnomalyDetectionPlugin();
    const context = createMockContext();

    await plugin.initialize(context);

    const event = makeEvent({ type: 'error' });
    const returned = plugin.onEvent(event);

    expect(returned).toBe(event);
    await plugin.shutdown();
  });

  it('should handle onEvent before initialization gracefully', () => {
    const plugin = new AnomalyDetectionPlugin();
    const event = makeEvent();

    // Should not throw even without initialization
    const result = plugin.onEvent(event);
    expect(result).toBe(event);
  });

  it('should shutdown cleanly', async () => {
    const plugin = new AnomalyDetectionPlugin();
    const context = createMockContext();

    await plugin.initialize(context);
    await expect(plugin.shutdown()).resolves.not.toThrow();
  });

  it('should clear evaluation timer on shutdown', async () => {
    const plugin = new AnomalyDetectionPlugin();
    const context = createMockContext();

    await plugin.initialize(context);

    // Timer should be running
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    await plugin.shutdown();

    // Timer should be cleared
    expect(jest.getTimerCount()).toBe(0);
  });
});
