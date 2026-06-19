import {
  ObservabilityConfig,
  InitConfig,
  DeepPartial,
  ConfigChangeListener,
} from './types';
import { createDefaultConfig } from './defaults';
import { detectEnvironment } from './environment';
import { validateInitConfig, validateConfig } from './validation';

function deepMerge<T extends Record<string, unknown>>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceVal = source[key];
    if (sourceVal === undefined) continue;

    const targetVal = result[key];
    if (
      targetVal !== null &&
      sourceVal !== null &&
      typeof targetVal === 'object' &&
      typeof sourceVal === 'object' &&
      !Array.isArray(targetVal) &&
      !Array.isArray(sourceVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as DeepPartial<Record<string, unknown>>,
      ) as T[keyof T];
    } else {
      result[key] = sourceVal as T[keyof T];
    }
  }
  return result;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current !== null && typeof current === 'object') {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, obj);
}

export class ConfigManager {
  private static instance: ConfigManager | null = null;

  private config: ObservabilityConfig | null = null;
  private listeners: Map<string, Set<ConfigChangeListener>> = new Map();
  private initialized = false;

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /** Reset singleton - primarily for testing */
  static resetInstance(): void {
    if (ConfigManager.instance) {
      ConfigManager.instance.listeners.clear();
      ConfigManager.instance.config = null;
      ConfigManager.instance.initialized = false;
    }
    ConfigManager.instance = null;
  }

  initialize(initConfig: InitConfig): ObservabilityConfig {
    validateInitConfig(initConfig);

    const env = initConfig.environment ?? detectEnvironment();
    const defaults = createDefaultConfig(env);

    this.config = {
      ...defaults,
      appId: initConfig.appId,
      appVersion: initConfig.appVersion,
      environment: env,
      debug: initConfig.debug ?? defaults.debug,
      features: {
        ...defaults.features,
        ...initConfig.features,
      },
      sampling: {
        ...defaults.sampling,
        ...initConfig.sampling,
        perLevel: {
          ...defaults.sampling.perLevel,
          ...initConfig.sampling?.perLevel,
        },
      },
      packages: {
        ...defaults.packages,
        core: {
          ...defaults.packages.core,
          ...initConfig.core,
        },
        logger: {
          ...defaults.packages.logger,
          ...initConfig.logger,
        },
      },
    };

    this.initialized = true;
    return this.config;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getConfig(): ObservabilityConfig {
    if (!this.config) {
      throw new Error('ConfigManager not initialized. Call initialize() first.');
    }
    return this.config;
  }

  getPackageConfig<K extends keyof ObservabilityConfig['packages']>(
    name: K,
  ): ObservabilityConfig['packages'][K] {
    const config = this.getConfig();
    const pkgConfig = config.packages[name];
    if (!pkgConfig) {
      throw new Error(`No configuration found for package: ${String(name)}`);
    }
    return pkgConfig;
  }

  updateConfig(partial: DeepPartial<ObservabilityConfig>): ObservabilityConfig {
    if (!this.config) {
      throw new Error('ConfigManager not initialized. Call initialize() first.');
    }

    const oldConfig = { ...this.config };
    this.config = deepMerge(
      this.config as unknown as Record<string, unknown>,
      partial as DeepPartial<Record<string, unknown>>,
    ) as unknown as ObservabilityConfig;
    validateConfig(this.config);

    // Notify listeners
    for (const [key, listenerSet] of this.listeners) {
      const oldVal = getNestedValue(oldConfig as unknown as Record<string, unknown>, key);
      const newVal = getNestedValue(this.config as unknown as Record<string, unknown>, key);
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        for (const listener of listenerSet) {
          try {
            listener(newVal, oldVal);
          } catch {
            // Isolate listener errors
          }
        }
      }
    }

    return this.config;
  }

  onChange<T = unknown>(key: string, listener: ConfigChangeListener<T>): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    const listenerSet = this.listeners.get(key)!;
    listenerSet.add(listener as ConfigChangeListener);

    // Return unsubscribe function
    return () => {
      listenerSet.delete(listener as ConfigChangeListener);
      if (listenerSet.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  isFeatureEnabled(flag: keyof ObservabilityConfig['features']): boolean {
    const config = this.getConfig();
    return config.features[flag] ?? false;
  }
}
