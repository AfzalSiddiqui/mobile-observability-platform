import { validateInitConfig, ConfigValidationError } from '../validation';

describe('validateInitConfig', () => {
  const valid = { appId: 'com.test', appVersion: '1.0.0' };

  it('should accept valid config', () => {
    expect(() => validateInitConfig(valid)).not.toThrow();
  });

  it('should reject empty appId', () => {
    expect(() => validateInitConfig({ ...valid, appId: '' })).toThrow(ConfigValidationError);
  });

  it('should reject empty appVersion', () => {
    expect(() => validateInitConfig({ ...valid, appVersion: '' })).toThrow(ConfigValidationError);
  });

  it('should reject invalid environment', () => {
    expect(() =>
      validateInitConfig({ ...valid, environment: 'test' as never }),
    ).toThrow(ConfigValidationError);
  });

  it('should reject sampling rate > 1', () => {
    expect(() =>
      validateInitConfig({ ...valid, sampling: { globalRate: 1.5 } }),
    ).toThrow(ConfigValidationError);
  });

  it('should reject sampling rate < 0', () => {
    expect(() =>
      validateInitConfig({ ...valid, sampling: { globalRate: -0.1 } }),
    ).toThrow(ConfigValidationError);
  });

  it('should reject NaN sampling rate', () => {
    expect(() =>
      validateInitConfig({ ...valid, sampling: { globalRate: NaN } }),
    ).toThrow(ConfigValidationError);
  });

  it('should reject non-integer buffer size', () => {
    expect(() =>
      validateInitConfig({ ...valid, core: { maxBufferSize: 1.5 } }),
    ).toThrow(ConfigValidationError);
  });

  it('should reject zero buffer size', () => {
    expect(() =>
      validateInitConfig({ ...valid, core: { maxBufferSize: 0 } }),
    ).toThrow(ConfigValidationError);
  });

  it('should validate per-level sampling rates', () => {
    expect(() =>
      validateInitConfig({ ...valid, sampling: { perLevel: { debug: 2 } } }),
    ).toThrow(ConfigValidationError);
  });

  it('should reject invalid maxBreadcrumbs', () => {
    expect(() =>
      validateInitConfig({ ...valid, logger: { maxBreadcrumbs: -1 } }),
    ).toThrow(ConfigValidationError);
  });
});
