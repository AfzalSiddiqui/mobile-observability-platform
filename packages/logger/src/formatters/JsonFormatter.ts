import { LogFormatter, LogEntry } from '../types';

export class JsonFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    return JSON.stringify({
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp,
      logger: entry.logger,
      context: entry.context,
      tags: entry.tags,
      error: entry.error,
    });
  }
}
