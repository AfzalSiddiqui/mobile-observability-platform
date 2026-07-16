import { ObservabilityEvent, generateEventId } from '@observability/core';
import { PerformanceEntry, LaunchConfig, PerformanceProcessor } from '../types';

type AppStateStatus = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';
type AppStateChangeHandler = (state: AppStateStatus) => void;

export class AppLaunchTracker {
  private readonly config: LaunchConfig;
  private readonly processors: PerformanceProcessor[];
  private readonly emit: ((event: ObservabilityEvent) => void) | null;
  private readonly sessionId: string;
  private readonly enableConsole: boolean;

  private coldLaunchStartTime: number;
  private coldLaunchReported = false;
  private lastBackgroundTime: number | null = null;
  private appStateSubscription: { remove(): void } | null = null;

  constructor(options: {
    config: LaunchConfig;
    processors?: PerformanceProcessor[];
    emit?: (event: ObservabilityEvent) => void;
    sessionId?: string;
    enableConsole?: boolean;
  }) {
    this.config = options.config;
    this.processors = options.processors ?? [];
    this.emit = options.emit ?? null;
    this.sessionId = options.sessionId ?? '';
    this.enableConsole = options.enableConsole ?? false;

    // Record process start time for cold launch measurement
    this.coldLaunchStartTime = Date.now();
  }

  /**
   * Call this when the app's first meaningful content has rendered.
   * Measures cold launch duration from tracker creation to this call.
   */
  reportColdLaunchEnd(): void {
    if (this.coldLaunchReported) return;
    this.coldLaunchReported = true;

    const duration = Date.now() - this.coldLaunchStartTime;
    const isSlow = duration > this.config.coldLaunchThreshold;

    const entry: PerformanceEntry = {
      metricType: 'cold_launch',
      name: 'app_cold_launch',
      startTime: this.coldLaunchStartTime,
      duration,
      context: {
        isSlow,
        threshold: this.config.coldLaunchThreshold,
      },
      tags: {
        launch_type: 'cold',
        ...(isSlow ? { slow: 'true' } : {}),
      },
    };

    this.reportEntry(entry);
  }

  /**
   * Start listening for app state changes to detect hot launches.
   * A hot launch is measured from when the app goes to background
   * until it returns to foreground (active).
   */
  startMonitoring(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AppState } = require('react-native');

      const handler: AppStateChangeHandler = (nextState: AppStateStatus) => {
        if (nextState === 'background') {
          this.lastBackgroundTime = Date.now();
        } else if (nextState === 'active' && this.lastBackgroundTime !== null) {
          const duration = Date.now() - this.lastBackgroundTime;
          const isSlow = duration > this.config.hotLaunchThreshold;

          const entry: PerformanceEntry = {
            metricType: 'hot_launch',
            name: 'app_hot_launch',
            startTime: this.lastBackgroundTime,
            duration,
            context: {
              isSlow,
              threshold: this.config.hotLaunchThreshold,
            },
            tags: {
              launch_type: 'hot',
              ...(isSlow ? { slow: 'true' } : {}),
            },
          };

          this.lastBackgroundTime = null;
          this.reportEntry(entry);
        }
      };

      this.appStateSubscription = AppState.addEventListener('change', handler);
    } catch {
      // react-native not available (e.g., in tests)
    }
  }

  stopMonitoring(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.lastBackgroundTime = null;
  }

  private reportEntry(entry: PerformanceEntry): void {
    let processed: PerformanceEntry | null = entry;
    for (const processor of this.processors) {
      if (!processed) break;
      try {
        processed = processor.process(processed);
      } catch {
        // Processor errors shouldn't prevent reporting
      }
    }

    if (!processed) return;

    if (this.enableConsole) {
      const label = processed.metricType === 'cold_launch' ? 'Cold Launch' : 'Hot Launch';
      const slowTag = processed.context.isSlow ? ' [SLOW]' : '';
      console.log(
        `[Performance] ${label}: ${processed.duration}ms${slowTag}`,
      );
    }

    this.emitEvent(processed);
  }

  private emitEvent(entry: PerformanceEntry): void {
    if (!this.emit || !this.sessionId) return;

    const event: ObservabilityEvent = {
      id: generateEventId(),
      type: 'performance',
      severity: entry.context.isSlow ? 'warn' : 'info',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data: {
        metricType: entry.metricType,
        name: entry.name,
        startTime: entry.startTime,
        duration: entry.duration,
        ...entry.context,
      },
      tags: entry.tags,
    };

    this.emit(event);
  }
}
