import { shouldSample, fnv1aHash } from '../sampling';

describe('fnv1aHash', () => {
  it('should return a value between 0 and 1', () => {
    const hash = fnv1aHash('test-id');
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(1);
  });

  it('should be deterministic', () => {
    expect(fnv1aHash('abc')).toBe(fnv1aHash('abc'));
  });

  it('should produce different hashes for different inputs', () => {
    expect(fnv1aHash('a')).not.toBe(fnv1aHash('b'));
  });
});

describe('shouldSample', () => {
  it('should always sample at rate 1', () => {
    for (let i = 0; i < 100; i++) {
      expect(shouldSample(1, `id-${i}`)).toBe(true);
    }
  });

  it('should never sample at rate 0', () => {
    for (let i = 0; i < 100; i++) {
      expect(shouldSample(0, `id-${i}`)).toBe(false);
    }
  });

  it('should be deterministic with identifier', () => {
    const result = shouldSample(0.5, 'fixed-id', true);
    for (let i = 0; i < 10; i++) {
      expect(shouldSample(0.5, 'fixed-id', true)).toBe(result);
    }
  });

  it('should approximate the target rate over many samples', () => {
    let sampled = 0;
    const total = 10000;
    for (let i = 0; i < total; i++) {
      if (shouldSample(0.3, `event-${i}`, true)) sampled++;
    }
    const rate = sampled / total;
    expect(rate).toBeGreaterThan(0.2);
    expect(rate).toBeLessThan(0.4);
  });

  it('should use random sampling when deterministic is false', () => {
    // Just verify it doesn't throw and returns boolean
    const result = shouldSample(0.5, undefined, false);
    expect(typeof result).toBe('boolean');
  });
});
