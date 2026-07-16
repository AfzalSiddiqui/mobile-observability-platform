import { ObservabilityEvent, generateEventId } from '@observability/core';
import { PerformanceEntry, LatencyConfig, PerformanceProcessor } from '../types';

interface ActiveSpan {
  name: string;
  startTime: number;
  context: Record<string, unknown>;
  tags: Record<string, string>;
}

/**
 * Tracks operation latencies using start/end span pairs.
 * Supports concurrent spans and flags slow operations.
 */
export class AppLatencyTracker {
  private readonly config: LatencyConfig;
  private readonly processors: PerformanceProcessor[];
  private readonly emit: ((event: ObservabilityEvent) => void) | null;
  private readonly sessionId: string;
  private readonly enableConsole: boolean;

  private readonly activeSpans: Map<string, ActiveSpan> = new Map();

  constructor(options: {
    config: LatencyConfig;
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
   * Start tracking a named operation.
   * Returns a span ID to use when ending the span.
   */
  startSpan(
    name: string,
    options?: {
      context?: Record<string, unknown>;
      tags?: Record<string, string>;
    },
  ): string {
    if (this.activeSpans.size >= this.config.maxConcurrentSpans) {
      // Drop oldest span to make room
      const oldest = this.activeSpans.keys().next().value;
      if (oldest) {
        this.activeSpans.delete(oldest);
      }
    }

    const spanId = generateEventId();

    this.activeSpans.set(spanId, {
      name,
      startTime: Date.now(),
      context: options?.context ?? {},
      tags: options?.tags ?? {},
    });

    return spanId;
  }

  /**
   * End a previously started span and report its duration.
   */
  endSpan(
    spanId: string,
    additionalContext?: Record<string, unknown>,
  ): number | null {
    const span = this.activeSpans.get(spanId);
    if (!span) return null;

    this.activeSpans.delete(spanId);

    const duration = Date.now() - span.startTime;
    const isSlow = duration > this.config.slowOperationThreshold;

    const entry: PerformanceEntry = {
      metricType: 'app_latency',
      name: span.name,
      startTime: span.startTime,
      duration,
      context: {
        ...span.context,
        ...additionalContext,
        isSlow,
        threshold: this.config.slowOperationThreshold,
      },
      tags: {
        ...span.tags,
        ...(isSlow ? { slow: 'true' } : {}),
      },
    };

    this.reportEntry(entry);
    return duration;
  }

  /**
   * Measure a synchronous operation's latency.
   */
  measure<T>(
    name: string,
    fn: () => T,
    options?: {
      context?: Record<string, unknown>;
      tags?: Record<string, string>;
    },
  ): T {
    const spanId = this.startSpan(name, options);
    try {
      const result = fn();
      this.endSpan(spanId);
      return result;
    } catch (error) {
      this.endSpan(spanId, { error: true });
      throw error;
    }
  }

  /**
   * Measure an async operation's latency.
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    options?: {
      context?: Record<string, unknown>;
      tags?: Record<string, string>;
    },
  ): Promise<T> {
    const spanId = this.startSpan(name, options);
    try {
      const result = await fn();
      this.endSpan(spanId);
      return result;
    } catch (error) {
      this.endSpan(spanId, { error: true });
      throw error;
    }
  }

  /**
   * Get the number of currently active spans.
   */
  getActiveSpanCount(): number {
    return this.activeSpans.size;
  }

  /**
   * Cancel all active spans without reporting.
   */
  cancelAll(): void {
    this.activeSpans.clear();
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
      const slowTag = processed.context.isSlow ? ' [SLOW]' : '';
      console.log(
        `[Performance] ${processed.name}: ${processed.duration}ms${slowTag}`,
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
