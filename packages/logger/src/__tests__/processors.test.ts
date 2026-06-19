import { TimestampProcessor } from '../processors/TimestampProcessor';
import { SamplingProcessor } from '../processors/SamplingProcessor';
import { SanitizationProcessor } from '../processors/SanitizationProcessor';
import { LogEntry } from '../types';

function makeEntry(overrides?: Partial<LogEntry>): LogEntry {
  return {
    level: 'info',
    message: 'test',
    context: {},
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
});

describe('SamplingProcessor', () => {
  it('should pass all entries at rate 1.0', () => {
    const proc = new SamplingProcessor({
      globalRate: 1.0,
      perLevel: {},
      deterministic: true,
    });
    for (let i = 0; i < 100; i++) {
      expect(proc.process(makeEntry({ message: `msg-${i}` }))).not.toBeNull();
    }
  });

  it('should drop all entries at rate 0', () => {
    const proc = new SamplingProcessor({
      globalRate: 0,
      perLevel: {},
      deterministic: true,
    });
    for (let i = 0; i < 100; i++) {
      expect(proc.process(makeEntry({ message: `msg-${i}` }))).toBeNull();
    }
  });

  it('should use per-level rate when set', () => {
    const proc = new SamplingProcessor({
      globalRate: 1.0,
      perLevel: { debug: 0 },
      deterministic: true,
    });
    expect(proc.process(makeEntry({ level: 'debug' }))).toBeNull();
    expect(proc.process(makeEntry({ level: 'error' }))).not.toBeNull();
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
});

describe('SanitizationProcessor', () => {
  it('should redact sensitive fields', () => {
    const proc = new SanitizationProcessor();
    const result = proc.process(makeEntry({
      context: {
        user: 'alice',
        password: 'secret123',
        token: 'abc',
      },
    }));
    expect(result!.context.user).toBe('alice');
    expect(result!.context.password).toBe('[REDACTED]');
    expect(result!.context.token).toBe('[REDACTED]');
  });

  it('should redact nested objects', () => {
    const proc = new SanitizationProcessor();
    const result = proc.process(makeEntry({
      context: {
        auth: {
          password: 'secret',
          user: 'bob',
        },
      },
    }));
    const auth = result!.context.auth as Record<string, unknown>;
    expect(auth.password).toBe('[REDACTED]');
    expect(auth.user).toBe('bob');
  });

  it('should accept custom sensitive fields', () => {
    const proc = new SanitizationProcessor(['customField']);
    const result = proc.process(makeEntry({
      context: { customField: 'value', safe: 'ok' },
    }));
    expect(result!.context.customField).toBe('[REDACTED]');
    expect(result!.context.safe).toBe('ok');
  });
});
