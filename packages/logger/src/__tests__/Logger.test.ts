import { Logger } from '../Logger';
import { LoggerConfig } from '@observability/config';
import { EventBus } from '@observability/core';
import { TimestampProcessor } from '../processors/TimestampProcessor';
import { ConsoleFormatter } from '../formatters/ConsoleFormatter';
import { BreadcrumbManager } from '../breadcrumbs/BreadcrumbManager';

const defaultConfig: LoggerConfig = {
  minLevel: 'debug',
  enableConsole: false,
  enableNativeCapture: false,
  maxBreadcrumbs: 50,
  sensitiveFields: [],
};

describe('Logger', () => {
  it('should log at each level', () => {
    const bus = new EventBus();
    const handler = jest.fn();
    bus.on('event', handler);

    const logger = new Logger({
      config: defaultConfig,
      eventBus: bus,
      sessionId: 'test-session',
    });

    logger.debug('debug msg');
    logger.info('info msg');
    logger.warn('warn msg');
    logger.error('error msg');
    logger.fatal('fatal msg');

    expect(handler).toHaveBeenCalledTimes(5);
  });

  it('should respect minimum log level', () => {
    const bus = new EventBus();
    const handler = jest.fn();
    bus.on('event', handler);

    const logger = new Logger({
      config: { ...defaultConfig, minLevel: 'warn' },
      eventBus: bus,
      sessionId: 'test-session',
    });

    logger.debug('should skip');
    logger.info('should skip');
    logger.warn('should log');
    logger.error('should log');

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should accept LogInput objects', () => {
    const bus = new EventBus();
    const handler = jest.fn();
    bus.on('event', handler);

    const logger = new Logger({
      config: defaultConfig,
      eventBus: bus,
      sessionId: 'test-session',
    });

    logger.info({ message: 'structured', context: { key: 'value' } });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should run processor pipeline', () => {
    const bus = new EventBus();
    const handler = jest.fn();
    bus.on('event', handler);

    const logger = new Logger({
      config: defaultConfig,
      processors: [new TimestampProcessor()],
      eventBus: bus,
      sessionId: 'test-session',
    });

    logger.info('with timestamp');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should create child loggers', () => {
    const bus = new EventBus();
    const handler = jest.fn();
    bus.on('event', handler);

    const logger = new Logger({
      config: defaultConfig,
      eventBus: bus,
      sessionId: 'test-session',
    });

    const child = logger.child('http', { module: 'http' });
    child.info('request completed');

    expect(handler).toHaveBeenCalledTimes(1);
    // The event was emitted - child works
  });

  it('should capture breadcrumbs', () => {
    const breadcrumbs = new BreadcrumbManager(10);
    const logger = new Logger({
      config: defaultConfig,
      breadcrumbManager: breadcrumbs,
    });

    logger.info('first');
    logger.warn('second');
    logger.error('third');

    expect(breadcrumbs.size()).toBe(3);
  });

  it('should output to console when enabled', () => {
    const spy = jest.spyOn(console, 'info').mockImplementation();
    const logger = new Logger({
      config: { ...defaultConfig, enableConsole: true },
      formatter: new ConsoleFormatter(),
    });

    logger.info('hello console');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain('hello console');
    spy.mockRestore();
  });

  it('should handle errors in log input', () => {
    const bus = new EventBus();
    const handler = jest.fn();
    bus.on('event', handler);

    const logger = new Logger({
      config: defaultConfig,
      eventBus: bus,
      sessionId: 'test-session',
    });

    logger.error({
      message: 'something failed',
      error: new Error('boom'),
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not throw if processor throws', () => {
    const badProcessor = {
      name: 'bad',
      process: () => { throw new Error('processor error'); },
    };

    const logger = new Logger({
      config: defaultConfig,
      processors: [badProcessor],
    });

    expect(() => logger.info('test')).not.toThrow();
  });
});
