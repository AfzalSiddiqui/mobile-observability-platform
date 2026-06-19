import { shouldSample, SamplingConfig } from '@observability/config';
import { LogProcessor, LogEntry } from '../types';

export class SamplingProcessor implements LogProcessor {
  readonly name = 'sampling';
  private samplingConfig: SamplingConfig;

  constructor(samplingConfig: SamplingConfig) {
    this.samplingConfig = samplingConfig;
  }

  updateConfig(config: SamplingConfig): void {
    this.samplingConfig = config;
  }

  process(entry: LogEntry): LogEntry | null {
    const levelRate = this.samplingConfig.perLevel[entry.level];
    const rate = levelRate ?? this.samplingConfig.globalRate;

    // Use message as identifier for deterministic sampling
    const identifier = `${entry.level}:${entry.message}`;

    if (!shouldSample(rate, identifier, this.samplingConfig.deterministic)) {
      return null;
    }

    return entry;
  }
}
