export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type Environment = 'development' | 'staging' | 'production';

export interface FeatureFlags {
  enableLogging: boolean;
  enableCrashReporting: boolean;
  enablePerformanceTracking: boolean;
  enableNetworkMonitoring: boolean;
  enableSessionTracking: boolean;
  enableAnalytics: boolean;
}

export interface SamplingConfig {
  /** Global sampling rate 0.0 - 1.0 */
  globalRate: number;
  /** Per-log-level sampling rates */
  perLevel: Partial<Record<LogLevel, number>>;
  /** Use deterministic (hash-based) sampling */
  deterministic: boolean;
}

export interface CoreConfig {
  /** Maximum events in the buffer before oldest are dropped */
  maxBufferSize: number;
  /** Flush interval in milliseconds */
  flushInterval: number;
  /** Number of events to trigger auto-flush */
  flushThreshold: number;
  /** Whether to persist buffered events across restarts */
  persistEvents: boolean;
  /** Maximum number of plugins allowed */
  maxPlugins: number;
}

export interface LoggerConfig {
  /** Minimum log level to process */
  minLevel: LogLevel;
  /** Whether to output to native console */
  enableConsole: boolean;
  /** Whether to capture native platform logs */
  enableNativeCapture: boolean;
  /** Maximum number of breadcrumbs to retain */
  maxBreadcrumbs: number;
  /** Fields to redact from log data */
  sensitiveFields: string[];
}

export interface PackageConfigs {
  core: CoreConfig;
  logger: LoggerConfig;
  [key: string]: unknown;
}

export interface InitConfig {
  /** Application identifier */
  appId: string;
  /** Application version string */
  appVersion: string;
  /** Deployment environment */
  environment?: Environment;
  /** Enable/disable debug mode */
  debug?: boolean;
  /** Feature flags */
  features?: Partial<FeatureFlags>;
  /** Sampling configuration */
  sampling?: Partial<SamplingConfig>;
  /** Core SDK configuration */
  core?: Partial<CoreConfig>;
  /** Logger configuration */
  logger?: Partial<LoggerConfig>;
}

export interface ObservabilityConfig {
  appId: string;
  appVersion: string;
  environment: Environment;
  debug: boolean;
  features: FeatureFlags;
  sampling: SamplingConfig;
  packages: PackageConfigs;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ConfigChangeListener<T = unknown> = (newValue: T, oldValue: T) => void;
