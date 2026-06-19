import { LogProcessor, LogEntry } from '../types';

export class TimestampProcessor implements LogProcessor {
  readonly name = 'timestamp';

  process(entry: LogEntry): LogEntry {
    return {
      ...entry,
      timestamp: new Date().toISOString(),
    };
  }
}
