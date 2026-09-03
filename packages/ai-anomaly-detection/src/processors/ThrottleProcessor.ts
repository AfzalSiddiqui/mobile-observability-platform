import { DetectedAnomaly, MetricSnapshot, ThrottledBatch } from '../types';

const MAX_BATCH_SIZE = 10;

export class ThrottleProcessor {
  private readonly cooldownMs: number;
  private lastFlushTime = 0;
  private pendingAnomalies: DetectedAnomaly[] = [];
  private pendingSnapshot: MetricSnapshot | null = null;

  constructor(cooldownMs: number) {
    this.cooldownMs = cooldownMs;
  }

  enqueue(anomalies: DetectedAnomaly[], snapshot: MetricSnapshot): ThrottledBatch | null {
    if (anomalies.length === 0) {
      return null;
    }

    this.pendingAnomalies.push(...anomalies);
    this.pendingSnapshot = snapshot;

    // Trim to max batch size (keep most recent)
    if (this.pendingAnomalies.length > MAX_BATCH_SIZE) {
      this.pendingAnomalies = this.pendingAnomalies.slice(-MAX_BATCH_SIZE);
    }

    const now = Date.now();
    if (now - this.lastFlushTime >= this.cooldownMs) {
      return this.flush();
    }

    return null;
  }

  flush(): ThrottledBatch | null {
    if (this.pendingAnomalies.length === 0 || !this.pendingSnapshot) {
      return null;
    }

    const batch: ThrottledBatch = {
      anomalies: this.pendingAnomalies,
      snapshot: this.pendingSnapshot,
    };

    this.pendingAnomalies = [];
    this.pendingSnapshot = null;
    this.lastFlushTime = Date.now();

    return batch;
  }

  hasPending(): boolean {
    return this.pendingAnomalies.length > 0;
  }

  reset(): void {
    this.pendingAnomalies = [];
    this.pendingSnapshot = null;
    this.lastFlushTime = 0;
  }
}
