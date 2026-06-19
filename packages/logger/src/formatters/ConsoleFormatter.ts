import { LogFormatter, LogEntry, LogLevel } from '../types';

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'DBG',
  info: 'INF',
  warn: 'WRN',
  error: 'ERR',
  fatal: 'FTL',
};

export class ConsoleFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const timestamp = entry.timestamp ?? new Date().toISOString();
    const level = LEVEL_LABELS[entry.level];
    const logger = entry.logger ? ` [${entry.logger}]` : '';
    let msg = `${timestamp} ${level}${logger} ${entry.message}`;

    if (Object.keys(entry.context).length > 0) {
      msg += ` ${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
      msg += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        msg += `\n  ${entry.error.stack}`;
      }
    }

    return msg;
  }
}
