import { LoggerConfig } from '@observability/config';
import { EventBus, createLogEvent, generateEventId } from '@observability/core';
import { LogLevel, LogInput, LogEntry, LogProcessor, LogFormatter, LOG_LEVEL_VALUES } from './types';
import { BreadcrumbManager } from './breadcrumbs/BreadcrumbManager';

export class Logger {
  private readonly name: string;
  private readonly processors: LogProcessor[];
  private readonly formatter: LogFormatter | null;
  private readonly config: LoggerConfig;
  private readonly eventBus: EventBus | null;
  private readonly sessionId: string;
  private readonly breadcrumbManager: BreadcrumbManager | null;
  private readonly defaultContext: Record<string, unknown>;

  constructor(options: {
    name?: string;
    config: LoggerConfig;
    processors?: LogProcessor[];
    formatter?: LogFormatter;
    eventBus?: EventBus;
    sessionId?: string;
    breadcrumbManager?: BreadcrumbManager;
    defaultContext?: Record<string, unknown>;
  }) {
    this.name = options.name ?? 'root';
    this.config = options.config;
    this.processors = options.processors ?? [];
    this.formatter = options.formatter ?? null;
    this.eventBus = options.eventBus ?? null;
    this.sessionId = options.sessionId ?? '';
    this.breadcrumbManager = options.breadcrumbManager ?? null;
    this.defaultContext = options.defaultContext ?? {};
  }

  debug(message: string, context?: Record<string, unknown>): void;
  debug(input: LogInput): void;
  debug(msgOrInput: string | LogInput, context?: Record<string, unknown>): void {
    this.log('debug', msgOrInput, context);
  }

  info(message: string, context?: Record<string, unknown>): void;
  info(input: LogInput): void;
  info(msgOrInput: string | LogInput, context?: Record<string, unknown>): void {
    this.log('info', msgOrInput, context);
  }

  warn(message: string, context?: Record<string, unknown>): void;
  warn(input: LogInput): void;
  warn(msgOrInput: string | LogInput, context?: Record<string, unknown>): void {
    this.log('warn', msgOrInput, context);
  }

  error(message: string, context?: Record<string, unknown>): void;
  error(input: LogInput): void;
  error(msgOrInput: string | LogInput, context?: Record<string, unknown>): void {
    this.log('error', msgOrInput, context);
  }

  fatal(message: string, context?: Record<string, unknown>): void;
  fatal(input: LogInput): void;
  fatal(msgOrInput: string | LogInput, context?: Record<string, unknown>): void {
    this.log('fatal', msgOrInput, context);
  }

  child(name: string, defaultContext?: Record<string, unknown>): Logger {
    const childName = this.name === 'root' ? name : `${this.name}.${name}`;
    return new Logger({
      name: childName,
      config: this.config,
      processors: this.processors,
      formatter: this.formatter ?? undefined,
      eventBus: this.eventBus ?? undefined,
      sessionId: this.sessionId,
      breadcrumbManager: this.breadcrumbManager ?? undefined,
      defaultContext: { ...this.defaultContext, ...defaultContext },
    });
  }

  private log(
    level: LogLevel,
    msgOrInput: string | LogInput,
    context?: Record<string, unknown>,
  ): void {
    // Check minimum log level
    if (LOG_LEVEL_VALUES[level] < LOG_LEVEL_VALUES[this.config.minLevel]) {
      return;
    }

    const input: LogInput = typeof msgOrInput === 'string'
      ? { message: msgOrInput, context }
      : msgOrInput;

    let entry: LogEntry | null = {
      level,
      message: input.message,
      context: { ...this.defaultContext, ...input.context },
      tags: input.tags ?? {},
      logger: this.name,
      error: input.error ? {
        name: input.error.name,
        message: input.error.message,
        stack: input.error.stack,
      } : undefined,
    };

    // Run through processor pipeline
    for (const processor of this.processors) {
      if (!entry) break;
      try {
        entry = processor.process(entry);
      } catch {
        // Processor errors shouldn't prevent logging
      }
    }

    if (!entry) return;

    // Add breadcrumb
    if (this.breadcrumbManager) {
      this.breadcrumbManager.add(
        'log',
        entry.message,
        level === 'fatal' ? 'error' : level === 'debug' ? 'debug' : level as 'info' | 'warn' | 'error',
        entry.context,
      );
    }

    // Console output in dev
    if (this.config.enableConsole && this.formatter) {
      const formatted = this.formatter.format(entry);
      this.writeToConsole(level, formatted);
    }

    // Emit to event bus
    if (this.eventBus && this.sessionId) {
      const event = createLogEvent(
        generateEventId(),
        this.sessionId,
        {
          level,
          message: entry.message,
          context: entry.context,
          stackTrace: entry.error?.stack,
        },
      );
      this.eventBus.emit('event', event);
    }
  }

  private writeToConsole(level: LogLevel, message: string): void {
    switch (level) {
      case 'debug': console.debug(message); break;
      case 'info': console.info(message); break;
      case 'warn': console.warn(message); break;
      case 'error':
      case 'fatal': console.error(message); break;
    }
  }
}
