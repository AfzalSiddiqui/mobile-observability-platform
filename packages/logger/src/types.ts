export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

export interface LogInput {
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
  tags?: Record<string, string>;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp?: string;
  context: Record<string, unknown>;
  tags: Record<string, string>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  logger?: string;
}

export interface LogProcessor {
  name: string;
  process(entry: LogEntry): LogEntry | null;
}

export interface LogFormatter {
  format(entry: LogEntry): string;
}
