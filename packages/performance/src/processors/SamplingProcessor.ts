import { SamplingConfig } from '@observability/config';
import { PerformanceEntry, PerformanceProcessor } from '../types';

export class SamplingProcessor implements PerformanceProcessor {
  readonly name = 'sampling';
  private config: SamplingConfig;

  constructor(config: SamplingConfig) {
    this.config = config;
  }

  process(entry: PerformanceEntry): PerformanceEntry | null {
    // Always report ANR and slow operations regardless of sampling
    if (entry.metricType === 'anr' || entry.context.isSlow) {
      return entry;
    }

    if (Math.random() > this.config.globalRate) {
      return null;
    }

    return entry;
  }

  updateConfig(config: SamplingConfig): void {
    this.config = config;
  }
}
