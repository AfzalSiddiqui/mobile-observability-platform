import { InitConfig, ObservabilityConfig } from './types';

export class ConfigValidationError extends Error {
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(`Config validation error [${field}]: ${message}`);
    this.name = 'ConfigValidationError';
  }
}

function validateRate(value: number, field: string): void {
  if (typeof value !== 'number' || isNaN(value) || value < 0 || value > 1) {
    throw new ConfigValidationError(field, `Must be a number between 0 and 1, got ${value}`);
  }
}

function validatePositiveInt(value: number, field: string): void {
  if (typeof value !== 'number' || isNaN(value) || value <= 0 || !Number.isInteger(value)) {
    throw new ConfigValidationError(field, `Must be a positive integer, got ${value}`);
  }
}

export function validateInitConfig(config: InitConfig): void {
  if (!config.appId || typeof config.appId !== 'string') {
    throw new ConfigValidationError('appId', 'appId is required and must be a non-empty string');
  }

  if (!config.appVersion || typeof config.appVersion !== 'string') {
    throw new ConfigValidationError('appVersion', 'appVersion is required and must be a non-empty string');
  }

  if (config.environment !== undefined) {
    const valid = ['development', 'staging', 'production'];
    if (!valid.includes(config.environment)) {
      throw new ConfigValidationError('environment', `Must be one of: ${valid.join(', ')}`);
    }
  }

  if (config.sampling) {
    if (config.sampling.globalRate !== undefined) {
      validateRate(config.sampling.globalRate, 'sampling.globalRate');
    }
    if (config.sampling.perLevel) {
      for (const [level, rate] of Object.entries(config.sampling.perLevel)) {
        if (rate !== undefined) {
          validateRate(rate, `sampling.perLevel.${level}`);
        }
      }
    }
  }

  if (config.core) {
    if (config.core.maxBufferSize !== undefined) {
      validatePositiveInt(config.core.maxBufferSize, 'core.maxBufferSize');
    }
    if (config.core.flushInterval !== undefined) {
      validatePositiveInt(config.core.flushInterval, 'core.flushInterval');
    }
    if (config.core.flushThreshold !== undefined) {
      validatePositiveInt(config.core.flushThreshold, 'core.flushThreshold');
    }
  }

  if (config.logger) {
    if (config.logger.maxBreadcrumbs !== undefined) {
      validatePositiveInt(config.logger.maxBreadcrumbs, 'logger.maxBreadcrumbs');
    }
  }

  if (config.analytics) {
    if (config.analytics.maxQueueSize !== undefined) {
      validatePositiveInt(config.analytics.maxQueueSize, 'analytics.maxQueueSize');
    }
  }
}

export function validateConfig(config: ObservabilityConfig): void {
  validateInitConfig({
    appId: config.appId,
    appVersion: config.appVersion,
    environment: config.environment,
    sampling: config.sampling,
    core: config.packages.core,
    logger: config.packages.logger,
    analytics: config.packages.analytics,
  });
}
