import { AnomalyAlert } from '../types';

const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export class DeduplicationProcessor {
  private readonly seenFingerprints: Map<string, number> = new Map();

  filter(alerts: AnomalyAlert[]): AnomalyAlert[] {
    const now = Date.now();
    this.purgeExpired(now);

    return alerts.filter((alert) => {
      const fingerprint = this.computeFingerprint(alert);
      const lastSeen = this.seenFingerprints.get(fingerprint);

      if (lastSeen !== undefined && now - lastSeen < DEDUP_WINDOW_MS) {
        return false;
      }

      this.seenFingerprints.set(fingerprint, now);
      return true;
    });
  }

  reset(): void {
    this.seenFingerprints.clear();
  }

  private computeFingerprint(alert: AnomalyAlert): string {
    return `${alert.anomaly.anomalyType}:${alert.anomaly.metricName}`;
  }

  private purgeExpired(now: number): void {
    for (const [fingerprint, timestamp] of this.seenFingerprints) {
      if (now - timestamp >= DEDUP_WINDOW_MS) {
        this.seenFingerprints.delete(fingerprint);
      }
    }
  }
}
