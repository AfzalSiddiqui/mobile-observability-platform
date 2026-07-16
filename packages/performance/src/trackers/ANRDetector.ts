import { ObservabilityEvent, generateEventId } from '@observability/core';
import { PerformanceEntry, ANRConfig, PerformanceProcessor } from '../types';

/**
 * Detects Application Not Responding (ANR) conditions by monitoring
 * JS thread responsiveness using a watchdog timer pattern.
 *
 * A timer schedules a callback on the JS event loop. If the callback
 * doesn't fire within the expected threshold, the main thread is
 * considered blocked (ANR).
 */
export class ANRDetector {
  private readonly config: ANRConfig;
  private readonly processors: PerformanceProcessor[];
  private readonly emit: ((event: ObservabilityEvent) => void) | null;
  private readonly sessionId: string;
  private readonly enableConsole: boolean;

  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeat: number = 0;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;
  private anrCount = 0;

  constructor(options: {
    config: ANRConfig;
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
  }

  /**
   * Start monitoring for ANR conditions.
   * Uses two timers:
   * - A heartbeat timer (setTimeout) that runs on the JS event loop and updates lastHeartbeat
   * - A watchdog timer (setInterval) that checks if the heartbeat is stale
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.anrCount = 0;

    this.lastHeartbeat = Date.now();
    this.scheduleHeartbeat();
    this.startWatchdog();
  }

  stop(): void {
    this.isRunning = false;

    if (this.watchdogTimer !== null) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }

    if (this.heartbeatTimer !== null) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  getANRCount(): number {
    return this.anrCount;
  }

  private scheduleHeartbeat(): void {
    if (!this.isRunning) return;

    this.heartbeatTimer = setTimeout(() => {
      this.lastHeartbeat = Date.now();
      this.scheduleHeartbeat();
    }, this.config.checkInterval / 2);
  }

  private startWatchdog(): void {
    this.watchdogTimer = setInterval(() => {
      const elapsed = Date.now() - this.lastHeartbeat;

      if (elapsed >= this.config.anrThreshold) {
        this.anrCount++;
        this.reportANR(elapsed);
        // Reset heartbeat to avoid flooding ANR reports
        this.lastHeartbeat = Date.now();
      }
    }, this.config.checkInterval);
  }

  private reportANR(blockedDuration: number): void {
    const startTime = Date.now() - blockedDuration;

    let entry: PerformanceEntry | null = {
      metricType: 'anr',
      name: 'anr_detected',
      startTime,
      duration: blockedDuration,
      context: {
        anrThreshold: this.config.anrThreshold,
        anrCount: this.anrCount,
      },
      tags: {
        metric: 'anr',
      },
    };

    for (const processor of this.processors) {
      if (!entry) break;
      try {
        entry = processor.process(entry);
      } catch {
        // Processor errors shouldn't prevent reporting
      }
    }

    if (!entry) return;

    if (this.enableConsole) {
      console.warn(
        `[Performance] ANR detected: JS thread blocked for ${blockedDuration}ms (threshold: ${this.config.anrThreshold}ms)`,
      );
    }

    this.emitEvent(entry);
  }

  private emitEvent(entry: PerformanceEntry): void {
    if (!this.emit || !this.sessionId) return;

    const event: ObservabilityEvent = {
      id: generateEventId(),
      type: 'performance',
      severity: 'error',
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
