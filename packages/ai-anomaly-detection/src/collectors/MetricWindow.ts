import { ObservabilityEvent, EventType } from '@observability/core';
import { MetricWindowData, MetricSnapshot } from '../types';

export class MetricWindow {
  private data: MetricWindowData;

  constructor(startTime: number, endTime: number) {
    this.data = {
      startTime,
      endTime,
      errorCount: 0,
      totalEventCount: 0,
      performanceDurations: [],
      perTypeCount: {},
    };
  }

  ingest(event: ObservabilityEvent): void {
    this.data.totalEventCount++;

    // Track per-type count
    const eventType = event.type as EventType;
    this.data.perTypeCount[eventType] = (this.data.perTypeCount[eventType] ?? 0) + 1;

    // Track errors
    if (event.type === 'error' || event.type === 'crash') {
      this.data.errorCount++;
    }

    // Track performance durations
    if (event.type === 'performance' && event.data) {
      const duration = (event.data as Record<string, unknown>).duration;
      if (typeof duration === 'number') {
        this.data.performanceDurations.push(duration);
      }
    }
  }

  getSnapshot(): MetricSnapshot {
    const durations = this.data.performanceDurations;
    const avgDuration =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : NaN;

    return {
      errorCount: this.data.errorCount,
      totalEventCount: this.data.totalEventCount,
      avgPerformanceDuration: avgDuration,
      perTypeCount: { ...this.data.perTypeCount },
      windowStart: this.data.startTime,
      windowEnd: this.data.endTime,
    };
  }

  getStartTime(): number {
    return this.data.startTime;
  }

  getEndTime(): number {
    return this.data.endTime;
  }
}
