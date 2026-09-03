import { ObservabilityEvent, EventType } from '@observability/core';
import { MetricSnapshot, BaselineStats } from '../types';
import { MetricWindow } from './MetricWindow';

export class MetricCollector {
  private readonly windowSizeMs: number;
  private readonly maxWindows: number;
  private readonly monitoredEventTypes: Set<EventType>;

  private currentWindow: MetricWindow | null = null;
  private completedWindows: MetricWindow[] = [];

  constructor(
    windowSizeMs: number,
    maxWindows: number,
    monitoredEventTypes: EventType[],
  ) {
    this.windowSizeMs = windowSizeMs;
    this.maxWindows = maxWindows;
    this.monitoredEventTypes = new Set(monitoredEventTypes);
  }

  ingest(event: ObservabilityEvent): void {
    if (!this.monitoredEventTypes.has(event.type as EventType)) {
      return;
    }

    const now = event.timestamp || Date.now();
    this.ensureCurrentWindow(now);
    this.currentWindow!.ingest(event);
  }

  getSnapshot(): MetricSnapshot | null {
    this.rotateWindowIfNeeded(Date.now());

    if (!this.currentWindow) {
      return null;
    }

    return this.currentWindow.getSnapshot();
  }

  getBaseline(metricExtractor: (snapshot: MetricSnapshot) => number): BaselineStats {
    const values: number[] = [];

    for (const window of this.completedWindows) {
      const snapshot = window.getSnapshot();
      const value = metricExtractor(snapshot);
      if (!isNaN(value)) {
        values.push(value);
      }
    }

    if (values.length === 0) {
      return { mean: 0, stddev: 0, sampleCount: 0 };
    }

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    const stddev = Math.sqrt(variance);

    return { mean, stddev, sampleCount: values.length };
  }

  getCompletedWindowCount(): number {
    return this.completedWindows.length;
  }

  reset(): void {
    this.currentWindow = null;
    this.completedWindows = [];
  }

  private ensureCurrentWindow(now: number): void {
    if (!this.currentWindow) {
      const windowStart = now;
      this.currentWindow = new MetricWindow(windowStart, windowStart + this.windowSizeMs);
      return;
    }

    if (now >= this.currentWindow.getEndTime()) {
      this.rotateWindowIfNeeded(now);
    }
  }

  private rotateWindowIfNeeded(now: number): void {
    if (!this.currentWindow) {
      return;
    }

    if (now >= this.currentWindow.getEndTime()) {
      this.completedWindows.push(this.currentWindow);

      // Evict oldest windows beyond maxWindows
      while (this.completedWindows.length > this.maxWindows) {
        this.completedWindows.shift();
      }

      const windowStart = now;
      this.currentWindow = new MetricWindow(windowStart, windowStart + this.windowSizeMs);
    }
  }
}
