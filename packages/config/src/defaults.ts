import { ObservabilityConfig, Environment, LogLevel } from './types';

function defaultLogLevel(env: Environment): LogLevel {
  return env === 'development' ? 'debug' : 'warn';
}

function isDebugByDefault(env: Environment): boolean {
  return env === 'development';
}

export function createDefaultConfig(env: Environment): ObservabilityConfig {
  return {
    appId: '',
    appVersion: '',
    environment: env,
    debug: isDebugByDefault(env),
    features: {
      enableLogging: true,
      enableCrashReporting: true,
      enablePerformanceTracking: true,
      enableNetworkMonitoring: true,
      enableSessionTracking: true,
      enableAnalytics: true,
    },
    sampling: {
      globalRate: 1.0,
      perLevel: {},
      deterministic: true,
    },
    packages: {
      core: {
        maxBufferSize: 1000,
        flushInterval: 30000,
        flushThreshold: 100,
        persistEvents: true,
        maxPlugins: 20,
      },
      logger: {
        minLevel: defaultLogLevel(env),
        enableConsole: env === 'development',
        enableNativeCapture: false,
        maxBreadcrumbs: 50,
        sensitiveFields: ['password', 'token', 'secret', 'authorization', 'cookie', 'creditCard', 'ssn'],
      },
      analytics: {
        enableConsole: env === 'development',
        sensitiveFields: ['password', 'token', 'secret', 'authorization', 'cookie', 'creditCard', 'ssn'],
        maxQueueSize: 500,
        enableAutoScreenTracking: false,
        defaultProperties: {},
      },
    },
  };
}
