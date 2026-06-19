import { ObservabilitySDK } from '../ObservabilitySDK';
import { Plugin } from '../types/plugin';

// Mock react-native
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}), { virtual: true });

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}), { virtual: true });

describe('ObservabilitySDK', () => {
  beforeEach(() => {
    ObservabilitySDK.resetInstance();
  });

  it('should be a singleton', () => {
    expect(ObservabilitySDK.getInstance()).toBe(ObservabilitySDK.getInstance());
  });

  it('should initialize successfully', async () => {
    const sdk = ObservabilitySDK.getInstance();
    const config = await sdk.init({
      appId: 'com.test.app',
      appVersion: '1.0.0',
      environment: 'development',
    });
    expect(config.appId).toBe('com.test.app');
    expect(sdk.isInitialized()).toBe(true);
  });

  it('should reject double init', async () => {
    const sdk = ObservabilitySDK.getInstance();
    await sdk.init({ appId: 'test', appVersion: '1.0.0' });
    await expect(sdk.init({ appId: 'test', appVersion: '1.0.0' })).rejects.toThrow('already initialized');
  });

  it('should emit and buffer events', async () => {
    const sdk = ObservabilitySDK.getInstance();
    await sdk.init({ appId: 'test', appVersion: '1.0.0', environment: 'development' });

    sdk.emit({
      id: 'e1', type: 'log', severity: 'info',
      timestamp: Date.now(), sessionId: sdk.getSessionId(),
      data: { message: 'hello' },
    });

    expect(sdk.getBuffer().size()).toBe(1);
  });

  it('should not emit before init', async () => {
    const sdk = ObservabilitySDK.getInstance();
    // Should not throw, just no-op
    sdk.emit({
      id: 'e1', type: 'log', severity: 'info',
      timestamp: Date.now(), sessionId: 'x', data: {},
    });
  });

  it('should register and run plugins', async () => {
    const sdk = ObservabilitySDK.getInstance();
    await sdk.init({ appId: 'test', appVersion: '1.0.0', environment: 'development' });

    const plugin: Plugin = {
      name: 'test-plugin',
      version: '1.0.0',
      initialize: jest.fn(),
      onEvent: jest.fn((e) => e),
    };
    await sdk.registerPlugin(plugin);
    expect(plugin.initialize).toHaveBeenCalled();

    sdk.emit({
      id: 'e1', type: 'log', severity: 'info',
      timestamp: Date.now(), sessionId: sdk.getSessionId(), data: {},
    });
    expect(plugin.onEvent).toHaveBeenCalled();
  });

  it('should drop events filtered by plugins', async () => {
    const sdk = ObservabilitySDK.getInstance();
    await sdk.init({ appId: 'test', appVersion: '1.0.0', environment: 'development' });

    await sdk.registerPlugin({
      name: 'dropper',
      version: '1.0.0',
      onEvent: () => null,
    });

    sdk.emit({
      id: 'e1', type: 'log', severity: 'info',
      timestamp: Date.now(), sessionId: sdk.getSessionId(), data: {},
    });
    expect(sdk.getBuffer().size()).toBe(0);
  });

  it('should shutdown cleanly', async () => {
    const sdk = ObservabilitySDK.getInstance();
    await sdk.init({ appId: 'test', appVersion: '1.0.0', environment: 'development' });
    await sdk.shutdown();
    expect(sdk.isInitialized()).toBe(false);
  });

  it('should have a session ID', () => {
    const sdk = ObservabilitySDK.getInstance();
    expect(sdk.getSessionId()).toMatch(/^[0-9a-f-]+$/);
  });
});
