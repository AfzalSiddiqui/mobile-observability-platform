import { DeviceInfo } from '@observability/core';
import { LogProcessor, LogEntry } from '../types';

export class DeviceInfoProcessor implements LogProcessor {
  readonly name = 'deviceInfo';
  private cachedInfo: DeviceInfo | null = null;

  process(entry: LogEntry): LogEntry {
    const deviceInfo = this.getDeviceInfo();
    return {
      ...entry,
      context: {
        ...entry.context,
        device: deviceInfo,
      },
    };
  }

  private getDeviceInfo(): DeviceInfo {
    if (this.cachedInfo) return this.cachedInfo;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Platform } = require('react-native');
      this.cachedInfo = {
        platform: Platform.OS as DeviceInfo['platform'],
        osVersion: String(Platform.Version),
        deviceModel: 'unknown',
        appVersion: 'unknown',
      };
    } catch {
      this.cachedInfo = {
        platform: 'unknown',
        osVersion: 'unknown',
        deviceModel: 'unknown',
        appVersion: 'unknown',
      };
    }

    return this.cachedInfo;
  }
}
