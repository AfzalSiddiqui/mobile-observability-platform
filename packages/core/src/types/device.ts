export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web' | 'unknown';
  osVersion: string;
  deviceModel: string;
  appVersion: string;
  buildNumber?: string;
  bundleId?: string;
  isEmulator?: boolean;
  screenWidth?: number;
  screenHeight?: number;
  locale?: string;
  timezone?: string;
}
