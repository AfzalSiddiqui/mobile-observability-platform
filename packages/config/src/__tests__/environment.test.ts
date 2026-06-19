import { detectEnvironment } from '../environment';

describe('detectEnvironment', () => {
  const originalDev = (globalThis as Record<string, unknown>).__DEV__;

  afterEach(() => {
    if (originalDev !== undefined) {
      (globalThis as Record<string, unknown>).__DEV__ = originalDev;
    } else {
      delete (globalThis as Record<string, unknown>).__DEV__;
    }
  });

  it('should detect development from __DEV__ = true', () => {
    (globalThis as Record<string, unknown>).__DEV__ = true;
    expect(detectEnvironment()).toBe('development');
  });

  it('should detect production from __DEV__ = false', () => {
    (globalThis as Record<string, unknown>).__DEV__ = false;
    expect(detectEnvironment()).toBe('production');
  });

  it('should fall back to process.env.NODE_ENV', () => {
    delete (globalThis as Record<string, unknown>).__DEV__;
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = 'staging';
    expect(detectEnvironment()).toBe('staging');
    process.env.NODE_ENV = orig;
  });

  it('should default to production when nothing is set', () => {
    delete (globalThis as Record<string, unknown>).__DEV__;
    const orig = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    expect(detectEnvironment()).toBe('production');
    process.env.NODE_ENV = orig;
  });
});
