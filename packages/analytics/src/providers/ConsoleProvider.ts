import { AnalyticsEntry } from '../types';
import { AnalyticsProvider } from './AnalyticsProvider';

export class ConsoleProvider implements AnalyticsProvider {
  readonly name = 'console';

  trackEvent(entry: AnalyticsEntry): void {
    const props = Object.keys(entry.properties).length > 0
      ? ` ${JSON.stringify(entry.properties)}`
      : '';
    console.log(`[Analytics] EVENT: ${entry.name}${props}`);
  }

  trackScreenView(entry: AnalyticsEntry): void {
    const props = Object.keys(entry.properties).length > 0
      ? ` ${JSON.stringify(entry.properties)}`
      : '';
    console.log(`[Analytics] SCREEN: ${entry.name}${props}`);
  }

  setUserProperties(properties: Record<string, unknown>): void {
    console.log(`[Analytics] USER_PROPS: ${JSON.stringify(properties)}`);
  }

  async flush(): Promise<void> {
    // Console provider has nothing to flush
  }

  async shutdown(): Promise<void> {
    // Console provider has nothing to clean up
  }
}
