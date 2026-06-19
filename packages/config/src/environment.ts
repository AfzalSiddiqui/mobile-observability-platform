import { Environment } from './types';

declare const __DEV__: boolean | undefined;

export function detectEnvironment(): Environment {
  // React Native __DEV__ global
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__ ? 'development' : 'production';
  }

  // Node.js / bundler environment
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    switch (process.env.NODE_ENV) {
      case 'development':
        return 'development';
      case 'staging':
        return 'staging';
      case 'production':
        return 'production';
      default:
        return 'development';
    }
  }

  return 'production';
}
