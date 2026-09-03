import { EventType } from '@observability/core';

// ── Configuration ──

export interface AnomalyDetectionConfig {
  /** Claude API key. Omit for statistical-only mode. */
  apiKey?: string;
  /** Claude model to use. */
  model: string;
  /** Size of each metric window in ms. */
  windowSizeMs: number;
  /** Number of windows to retain. */
  maxWindows: number;
  /** How often to run anomaly evaluation in ms. */
  evaluationIntervalMs: number;
  /** Z-score threshold for anomaly flagging. */
  sensitivityThreshold: number;
  /** Which event types to monitor. */
  monitoredEventTypes: EventType[];
  /** Minimum cooldown between AI API calls in ms. */
  aiCooldownMs: number;
  /** Whether to log detection results to console. */
  enableConsole: boolean;
}

export const DEFAULT_ANOMALY_DETECTION_CONFIG: AnomalyDetectionConfig = {
  model: 'claude-sonnet-4-20250514',
  windowSizeMs: 60_000,
  maxWindows: 10,
  evaluationIntervalMs: 15_000,
  sensitivityThreshold: 2.5,
  monitoredEventTypes: [
    'log',
    'error',
    'crash',
    'network',
    'performance',
    'navigation',
    'user_action',
    'session',
    'custom',
  ],
  aiCooldownMs: 30_000,
  enableConsole: false,
};

// ── Metric Types ──

export interface MetricSnapshot {
  /** Error events in this window. */
  errorCount: number;
  /** Total events in this window. */
  totalEventCount: number;
  /** Average performance duration in ms (NaN if no performance events). */
  avgPerformanceDuration: number;
  /** Event count per type. */
  perTypeCount: Partial<Record<EventType, number>>;
  /** Window start timestamp. */
  windowStart: number;
  /** Window end timestamp. */
  windowEnd: number;
}

export interface BaselineStats {
  mean: number;
  stddev: number;
  sampleCount: number;
}

// ── Anomaly Types ──

export type AnomalyType =
  | 'error_rate_spike'
  | 'latency_degradation'
  | 'traffic_surge'
  | 'traffic_drop'
  | 'event_type_spike'
  | 'event_type_drop';

export interface DetectedAnomaly {
  anomalyType: AnomalyType;
  metricName: string;
  currentValue: number;
  baselineMean: number;
  zScore: number;
  timestamp: number;
}

export interface AIAnalysisResult {
  explanation: string;
  severity: string;
  rootCause: string;
  recommendations: string[];
}

export interface AnomalyAlert {
  anomaly: DetectedAnomaly;
  aiResult: AIAnalysisResult | null;
  detectionMode: 'statistical+ai' | 'statistical-only';
}

// ── Anomaly Event Data ──

export interface AnomalyEventData {
  anomalyType: AnomalyType;
  metricName: string;
  currentValue: number;
  baselineMean: number;
  zScore: number;
  aiExplanation: string | null;
  aiSeverity: string | null;
  aiRootCause: string | null;
  aiRecommendations: string[] | null;
  detectionMode: 'statistical+ai' | 'statistical-only';
}

// ── Internal Interfaces ──

export interface MetricWindowData {
  startTime: number;
  endTime: number;
  errorCount: number;
  totalEventCount: number;
  performanceDurations: number[];
  perTypeCount: Partial<Record<EventType, number>>;
}

export interface ThrottledBatch {
  anomalies: DetectedAnomaly[];
  snapshot: MetricSnapshot;
}
