import { PerformanceEntry, PerformanceProcessor } from '../types';

export class TimestampProcessor implements PerformanceProcessor {
  readonly name = 'timestamp';

  process(entry: PerformanceEntry): PerformanceEntry {
    return {
      ...entry,
      timestamp: entry.timestamp ?? new Date(entry.startTime).toISOString(),
    };
  }
}
