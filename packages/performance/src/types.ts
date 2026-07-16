export type PerformanceMetricType =
  | 'cold_launch'
  | 'hot_launch'
  | 'app_latency'
  | 'anr';

export interface PerformanceEntry {
  metricType: PerformanceMetricType;
  name: string;
  startTime: number;
  duration: number;
  timestamp?: string;
  context: Record<string, unknown>;
  tags: Record<string, string>;
}

export interface PerformanceProcessor {
  name: string;
  process(entry: PerformanceEntry): PerformanceEntry | null;
}

export interface LaunchConfig {
  /** Threshold in ms to consider a cold launch as slow */
  coldLaunchThreshold: number;
  /** Threshold in ms to consider a hot launch as slow */
  hotLaunchThreshold: number;
}

export interface ANRConfig {
  /** Interval in ms between watchdog checks */
  checkInterval: number;
  /** Threshold in ms to consider the main thread as unresponsive */
  anrThreshold: number;
}

export interface LatencyConfig {
  /** Threshold in ms to flag an operation as slow */
  slowOperationThreshold: number;
  /** Maximum number of concurrent spans to track */
  maxConcurrentSpans: number;
}

export interface PerformanceConfig {
  /** Enable cold/hot launch tracking */
  enableLaunchTracking: boolean;
  /** Enable ANR detection */
  enableANRDetection: boolean;
  /** Enable app latency tracking */
  enableLatencyTracking: boolean;
  /** Whether to output performance events to console */
  enableConsole: boolean;
  /** Launch timing configuration */
  launch: LaunchConfig;
  /** ANR detection configuration */
  anr: ANRConfig;
  /** Latency tracking configuration */
  latency: LatencyConfig;
}
