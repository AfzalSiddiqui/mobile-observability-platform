import { ConsoleFormatter } from '../formatters/ConsoleFormatter';
import { JsonFormatter } from '../formatters/JsonFormatter';
import { LogEntry } from '../types';

const entry: LogEntry = {
  level: 'info',
  message: 'test message',
  timestamp: '2025-01-01T00:00:00.000Z',
  context: { key: 'value' },
  tags: {},
  logger: 'test',
};

describe('ConsoleFormatter', () => {
  it('should format with timestamp and level', () => {
    const fmt = new ConsoleFormatter();
    const result = fmt.format(entry);
    expect(result).toContain('2025-01-01T00:00:00.000Z');
    expect(result).toContain('INF');
    expect(result).toContain('[test]');
    expect(result).toContain('test message');
  });

  it('should include context', () => {
    const fmt = new ConsoleFormatter();
    const result = fmt.format(entry);
    expect(result).toContain('"key":"value"');
  });

  it('should include error info', () => {
    const fmt = new ConsoleFormatter();
    const result = fmt.format({
      ...entry,
      error: { name: 'Error', message: 'boom', stack: 'stack trace' },
    });
    expect(result).toContain('Error: boom');
    expect(result).toContain('stack trace');
  });
});

describe('JsonFormatter', () => {
  it('should produce valid JSON', () => {
    const fmt = new JsonFormatter();
    const result = fmt.format(entry);
    const parsed = JSON.parse(result);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('test message');
    expect(parsed.logger).toBe('test');
  });
});
