import { TimestampProcessor } from '../processors/TimestampProcessor';
import { SamplingProcessor } from '../processors/SamplingProcessor';
import { SanitizationProcessor } from '../processors/SanitizationProcessor';
import { EnrichmentProcessor } from '../processors/EnrichmentProcessor';
import { AnalyticsEntry } from '../types';

function makeEntry(overrides?: Partial<AnalyticsEntry>): AnalyticsEntry {
  return {
    type: 'track',
    name: 'test_event',
    properties: {},
    userProperties: {},
    tags: {},
    ...overrides,
  };
}

describe('TimestampProcessor', () => {
  it('should add ISO timestamp', () => {
    const proc = new TimestampProcessor();
    const result = proc.process(makeEntry());
    expect(result!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should not modify other fields', () => {
    const proc = new TimestampProcessor();
    const entry = makeEntry({ name: 'original' });
    const result = proc.process(entry);
    expect(result!.name).toBe('original');
    expect(result!.type).toBe('track');
  });
});

describe('SamplingProcessor', () => {
  it('should pass all entries at rate 1.0', () => {
    const proc = new SamplingProcessor({
      globalRate: 1.0,
      perLevel: {},
      deterministic: true,
    });
    for (let i = 0; i < 100; i++) {
      expect(proc.process(makeEntry({ name: `event-${i}` }))).not.toBeNull();
    }
  });

  it('should drop all entries at rate 0', () => {
    const proc = new SamplingProcessor({
      globalRate: 0,
      perLevel: {},
      deterministic: true,
    });
    for (let i = 0; i < 100; i++) {
      expect(proc.process(makeEntry({ name: `event-${i}` }))).toBeNull();
    }
  });

  it('should support config update', () => {
    const proc = new SamplingProcessor({
      globalRate: 1.0,
      perLevel: {},
      deterministic: true,
    });
    proc.updateConfig({ globalRate: 0, perLevel: {}, deterministic: true });
    expect(proc.process(makeEntry())).toBeNull();
  });

  it('should use deterministic sampling based on name', () => {
    const proc = new SamplingProcessor({
      globalRate: 0.5,
      perLevel: {},
      deterministic: true,
    });
    // Same event name should always produce the same result
    const result1 = proc.process(makeEntry({ name: 'consistent_event' }));
    const result2 = proc.process(makeEntry({ name: 'consistent_event' }));
    expect(result1 === null).toBe(result2 === null);
  });
});

describe('SanitizationProcessor', () => {
  it('should redact sensitive fields in properties', () => {
    const proc = new SanitizationProcessor();
    const result = proc.process(makeEntry({
      properties: {
        user: 'alice',
        password: 'secret123',
        token: 'abc',
      },
    }));
    expect(result!.properties.user).toBe('alice');
    expect(result!.properties.password).toBe('[REDACTED]');
    expect(result!.properties.token).toBe('[REDACTED]');
  });

  it('should redact sensitive fields in userProperties', () => {
    const proc = new SanitizationProcessor();
    const result = proc.process(makeEntry({
      userProperties: {
        name: 'alice',
        api_key: 'secret',
      },
    }));
    expect(result!.userProperties.name).toBe('alice');
    expect(result!.userProperties.api_key).toBe('[REDACTED]');
  });

  it('should redact nested objects', () => {
    const proc = new SanitizationProcessor();
    const result = proc.process(makeEntry({
      properties: {
        auth: {
          password: 'secret',
          user: 'bob',
        },
      },
    }));
    const auth = result!.properties.auth as Record<string, unknown>;
    expect(auth.password).toBe('[REDACTED]');
    expect(auth.user).toBe('bob');
  });

  it('should accept custom sensitive fields', () => {
    const proc = new SanitizationProcessor(['customField']);
    const result = proc.process(makeEntry({
      properties: { customField: 'value', safe: 'ok' },
    }));
    expect(result!.properties.customField).toBe('[REDACTED]');
    expect(result!.properties.safe).toBe('ok');
  });
});

describe('EnrichmentProcessor', () => {
  it('should add device info', () => {
    const proc = new EnrichmentProcessor();
    const result = proc.process(makeEntry());
    expect(result!.properties.device).toBeDefined();
    const device = result!.properties.device as Record<string, unknown>;
    expect(device.platform).toBeDefined();
  });

  it('should add default properties', () => {
    const proc = new EnrichmentProcessor({ appName: 'TestApp', version: '2.0' });
    const result = proc.process(makeEntry());
    expect(result!.properties.appName).toBe('TestApp');
    expect(result!.properties.version).toBe('2.0');
  });

  it('should not overwrite existing properties with defaults', () => {
    const proc = new EnrichmentProcessor({ key: 'default' });
    const result = proc.process(makeEntry({
      properties: { key: 'custom' },
    }));
    expect(result!.properties.key).toBe('custom');
  });

  it('should cache device info across calls', () => {
    const proc = new EnrichmentProcessor();
    const result1 = proc.process(makeEntry());
    const result2 = proc.process(makeEntry());
    expect(result1!.properties.device).toEqual(result2!.properties.device);
  });
});
