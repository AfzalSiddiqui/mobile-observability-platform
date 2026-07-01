export interface TrackEventInput {
  name: string;
  properties?: Record<string, unknown>;
  tags?: Record<string, string>;
}

export interface ScreenViewInput {
  screenName: string;
  properties?: Record<string, unknown>;
  tags?: Record<string, string>;
}

export type AnalyticsEventType = 'track' | 'screen';

export interface AnalyticsEntry {
  type: AnalyticsEventType;
  name: string;
  timestamp?: string;
  properties: Record<string, unknown>;
  userProperties: Record<string, unknown>;
  userId?: string;
  tags: Record<string, string>;
}

export interface AnalyticsProcessor {
  name: string;
  process(entry: AnalyticsEntry): AnalyticsEntry | null;
}
