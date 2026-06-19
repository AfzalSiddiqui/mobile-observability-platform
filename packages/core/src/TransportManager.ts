import { Transport, NoopTransport } from './types/transport';
import { ObservabilityEvent } from './types/events';

export class TransportManager {
  private transports: Transport[] = [];
  private initialized = false;

  constructor() {
    // Default NoopTransport ensures events are always accepted
    this.transports.push(new NoopTransport());
  }

  addTransport(transport: Transport): void {
    // Remove noop when a real transport is added
    if (this.transports.length === 1 && this.transports[0].name === 'noop') {
      this.transports = [];
    }
    this.transports.push(transport);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    for (const transport of this.transports) {
      if (transport.initialize) {
        try {
          await transport.initialize();
        } catch {
          // Individual transport init failure shouldn't block others
        }
      }
    }
    this.initialized = true;
  }

  /** Fan-out: send events to all registered transports */
  async send(events: ObservabilityEvent[]): Promise<void> {
    if (events.length === 0) return;

    const results = await Promise.allSettled(
      this.transports.map((t) => t.send(events)),
    );

    // If ALL transports failed, throw so EventBuffer can retry
    const allFailed = results.every((r) => r.status === 'rejected');
    if (allFailed && results.length > 0) {
      throw new Error('All transports failed to send events');
    }
  }

  async shutdown(): Promise<void> {
    for (const transport of this.transports) {
      if (transport.shutdown) {
        try {
          await transport.shutdown();
        } catch {
          // Best-effort shutdown
        }
      }
    }
    this.initialized = false;
  }

  getTransports(): readonly Transport[] {
    return this.transports;
  }
}
