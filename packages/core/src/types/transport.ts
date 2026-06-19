import { ObservabilityEvent } from './events';

export interface Transport {
  readonly name: string;
  initialize?(): Promise<void>;
  send(events: ObservabilityEvent[]): Promise<void>;
  shutdown?(): Promise<void>;
}

/**
 * Default transport that accepts and discards all events.
 * Fulfills the local-only requirement: events are buffered but never leave the device.
 */
export class NoopTransport implements Transport {
  readonly name = 'noop';

  async send(_events: ObservabilityEvent[]): Promise<void> {
    // Intentionally empty - events are discarded
  }
}
