import { AnalyticsEntry } from '../types';

export interface AnalyticsProvider {
  readonly name: string;
  initialize?(): Promise<void> | void;
  trackEvent(entry: AnalyticsEntry): void;
  trackScreenView(entry: AnalyticsEntry): void;
  setUserProperties(properties: Record<string, unknown>): void;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}
