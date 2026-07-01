import { AnalyticsProcessor, AnalyticsEntry } from '../types';

export class TimestampProcessor implements AnalyticsProcessor {
  readonly name = 'timestamp';

  process(entry: AnalyticsEntry): AnalyticsEntry {
    return {
      ...entry,
      timestamp: new Date().toISOString(),
    };
  }
}
