import { shouldSample, SamplingConfig } from '@observability/config';
import { AnalyticsProcessor, AnalyticsEntry } from '../types';

export class SamplingProcessor implements AnalyticsProcessor {
  readonly name = 'sampling';
  private samplingConfig: SamplingConfig;

  constructor(samplingConfig: SamplingConfig) {
    this.samplingConfig = samplingConfig;
  }

  updateConfig(config: SamplingConfig): void {
    this.samplingConfig = config;
  }

  process(entry: AnalyticsEntry): AnalyticsEntry | null {
    const rate = this.samplingConfig.globalRate;
    const identifier = `${entry.type}:${entry.name}`;

    if (!shouldSample(rate, identifier, this.samplingConfig.deterministic)) {
      return null;
    }

    return entry;
  }
}
