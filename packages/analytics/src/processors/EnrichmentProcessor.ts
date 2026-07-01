import { DeviceInfo } from '@observability/core';
import { AnalyticsProcessor, AnalyticsEntry } from '../types';

export class EnrichmentProcessor implements AnalyticsProcessor {
  readonly name = 'enrichment';
  private cachedDeviceInfo: DeviceInfo | null = null;
  private defaultProperties: Record<string, unknown>;

  constructor(defaultProperties: Record<string, unknown> = {}) {
    this.defaultProperties = defaultProperties;
  }

  process(entry: AnalyticsEntry): AnalyticsEntry {
    const deviceInfo = this.getDeviceInfo();
    return {
      ...entry,
      properties: {
        ...this.defaultProperties,
        ...entry.properties,
        device: deviceInfo,
      },
    };
  }

  private getDeviceInfo(): DeviceInfo {
    if (this.cachedDeviceInfo) return this.cachedDeviceInfo;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Platform } = require('react-native');
      this.cachedDeviceInfo = {
        platform: Platform.OS as DeviceInfo['platform'],
        osVersion: String(Platform.Version),
        deviceModel: 'unknown',
        appVersion: 'unknown',
      };
    } catch {
      this.cachedDeviceInfo = {
        platform: 'unknown',
        osVersion: 'unknown',
        deviceModel: 'unknown',
        appVersion: 'unknown',
      };
    }

    return this.cachedDeviceInfo;
  }
}
