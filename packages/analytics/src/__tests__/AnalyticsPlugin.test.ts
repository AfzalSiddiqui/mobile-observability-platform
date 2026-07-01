import { AnalyticsPlugin } from '../AnalyticsPlugin';
import { ConfigManager } from '@observability/config';
import { PluginContext } from '@observability/core';

// Mock ObservabilitySDK to avoid singleton issues in tests
jest.mock('@observability/core', () => {
  const actual = jest.requireActual('@observability/core');
  return {
    ...actual,
    ObservabilitySDK: {
      getInstance: () => {
        throw new Error('Not available in test');
      },
    },
  };
});

function createMockContext(): PluginContext {
  return {
    emit: jest.fn(),
    getSessionId: () => 'test-session-id',
    generateId: () => 'test-id',
  };
}

describe('AnalyticsPlugin', () => {
  beforeEach(() => {
    ConfigManager.resetInstance();
    ConfigManager.getInstance().initialize({
      appId: 'test-app',
      appVersion: '1.0.0',
      environment: 'development',
    });
  });

  afterEach(() => {
    ConfigManager.resetInstance();
  });

  it('should have correct name and version', () => {
    const plugin = new AnalyticsPlugin();
    expect(plugin.name).toBe('analytics');
    expect(plugin.version).toBe('1.0.0');
  });

  it('should throw when getAnalytics called before init', () => {
    const plugin = new AnalyticsPlugin();
    expect(() => plugin.getAnalytics()).toThrow('AnalyticsPlugin not initialized');
  });

  it('should initialize and provide analytics instance', async () => {
    const plugin = new AnalyticsPlugin();
    await plugin.initialize(createMockContext());
    expect(() => plugin.getAnalytics()).not.toThrow();
  });

  it('should pass through SDK events in onEvent', async () => {
    const plugin = new AnalyticsPlugin();
    await plugin.initialize(createMockContext());

    const event = {
      id: '1',
      type: 'log' as const,
      severity: 'info' as const,
      timestamp: Date.now(),
      sessionId: 'test',
      data: {},
    };
    expect(plugin.onEvent(event)).toBe(event);
  });

  it('should shutdown cleanly', async () => {
    const plugin = new AnalyticsPlugin();
    await plugin.initialize(createMockContext());
    await expect(plugin.shutdown()).resolves.not.toThrow();
    expect(() => plugin.getAnalytics()).toThrow();
  });
});
