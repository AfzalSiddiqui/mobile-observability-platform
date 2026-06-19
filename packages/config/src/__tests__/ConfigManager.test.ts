import { ConfigManager } from '../ConfigManager';
import { InitConfig } from '../types';

const validInit: InitConfig = {
  appId: 'com.test.app',
  appVersion: '1.0.0',
  environment: 'development',
};

describe('ConfigManager', () => {
  beforeEach(() => {
    ConfigManager.resetInstance();
  });

  it('should be a singleton', () => {
    const a = ConfigManager.getInstance();
    const b = ConfigManager.getInstance();
    expect(a).toBe(b);
  });

  it('should throw if getConfig called before initialize', () => {
    const mgr = ConfigManager.getInstance();
    expect(() => mgr.getConfig()).toThrow('ConfigManager not initialized');
  });

  it('should initialize with valid config', () => {
    const mgr = ConfigManager.getInstance();
    const config = mgr.initialize(validInit);
    expect(config.appId).toBe('com.test.app');
    expect(config.appVersion).toBe('1.0.0');
    expect(config.environment).toBe('development');
    expect(mgr.isInitialized()).toBe(true);
  });

  it('should apply defaults for development', () => {
    const mgr = ConfigManager.getInstance();
    const config = mgr.initialize(validInit);
    expect(config.debug).toBe(true);
    expect(config.packages.logger.minLevel).toBe('debug');
    expect(config.packages.logger.enableConsole).toBe(true);
  });

  it('should apply defaults for production', () => {
    const mgr = ConfigManager.getInstance();
    const config = mgr.initialize({ ...validInit, environment: 'production' });
    expect(config.debug).toBe(false);
    expect(config.packages.logger.minLevel).toBe('warn');
    expect(config.packages.logger.enableConsole).toBe(false);
  });

  it('should merge user overrides', () => {
    const mgr = ConfigManager.getInstance();
    const config = mgr.initialize({
      ...validInit,
      debug: false,
      sampling: { globalRate: 0.5 },
      core: { maxBufferSize: 500 },
      logger: { minLevel: 'error' },
    });
    expect(config.debug).toBe(false);
    expect(config.sampling.globalRate).toBe(0.5);
    expect(config.sampling.deterministic).toBe(true); // default preserved
    expect(config.packages.core.maxBufferSize).toBe(500);
    expect(config.packages.logger.minLevel).toBe('error');
  });

  it('should throw on invalid appId', () => {
    const mgr = ConfigManager.getInstance();
    expect(() => mgr.initialize({ appId: '', appVersion: '1.0' })).toThrow('appId');
  });

  it('should return package config', () => {
    const mgr = ConfigManager.getInstance();
    mgr.initialize(validInit);
    const loggerConfig = mgr.getPackageConfig('logger');
    expect(loggerConfig.minLevel).toBe('debug');
  });

  it('should update config and notify listeners', () => {
    const mgr = ConfigManager.getInstance();
    mgr.initialize(validInit);

    const listener = jest.fn();
    mgr.onChange('debug', listener);
    mgr.updateConfig({ debug: false });

    expect(listener).toHaveBeenCalledWith(false, true);
    expect(mgr.getConfig().debug).toBe(false);
  });

  it('should not notify listener if value unchanged', () => {
    const mgr = ConfigManager.getInstance();
    mgr.initialize(validInit);

    const listener = jest.fn();
    mgr.onChange('appId', listener);
    mgr.updateConfig({ debug: false });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should allow unsubscribing from changes', () => {
    const mgr = ConfigManager.getInstance();
    mgr.initialize(validInit);

    const listener = jest.fn();
    const unsub = mgr.onChange('debug', listener);
    unsub();
    mgr.updateConfig({ debug: false });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should check feature flags', () => {
    const mgr = ConfigManager.getInstance();
    mgr.initialize({ ...validInit, features: { enableLogging: false } });
    expect(mgr.isFeatureEnabled('enableLogging')).toBe(false);
    expect(mgr.isFeatureEnabled('enableCrashReporting')).toBe(true);
  });

  it('should isolate listener errors', () => {
    const mgr = ConfigManager.getInstance();
    mgr.initialize(validInit);

    const badListener = jest.fn(() => { throw new Error('boom'); });
    const goodListener = jest.fn();
    mgr.onChange('debug', badListener);
    mgr.onChange('debug', goodListener);

    expect(() => mgr.updateConfig({ debug: false })).not.toThrow();
    expect(goodListener).toHaveBeenCalled();
  });
});
