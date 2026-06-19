import { ObservabilityEvent } from './types/events';
import { StorageAdapter } from './types/storage';

export type FlushStrategy = 'immediate' | 'interval' | 'count' | 'manual';

export interface EventBufferOptions {
  maxSize: number;
  flushStrategy: FlushStrategy;
  flushInterval?: number;
  flushThreshold?: number;
  storage?: StorageAdapter;
  storageKey?: string;
  onFlush: (events: ObservabilityEvent[]) => Promise<void>;
}

export class EventBuffer {
  private buffer: ObservabilityEvent[] = [];
  private readonly maxSize: number;
  private readonly flushStrategy: FlushStrategy;
  private readonly flushThreshold: number;
  private readonly onFlush: (events: ObservabilityEvent[]) => Promise<void>;
  private readonly storage?: StorageAdapter;
  private readonly storageKey: string;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private flushing = false;

  constructor(options: EventBufferOptions) {
    this.maxSize = options.maxSize;
    this.flushStrategy = options.flushStrategy;
    this.flushThreshold = options.flushThreshold ?? 100;
    this.onFlush = options.onFlush;
    this.storage = options.storage;
    this.storageKey = options.storageKey ?? '@observability/event_buffer';

    if (this.flushStrategy === 'interval' && options.flushInterval) {
      this.startInterval(options.flushInterval);
    }
  }

  add(event: ObservabilityEvent): void {
    // Circular buffer: drop oldest if at capacity
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift();
    }
    this.buffer.push(event);

    if (this.flushStrategy === 'immediate') {
      void this.flush();
    } else if (this.flushStrategy === 'count' && this.buffer.length >= this.flushThreshold) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return;

    this.flushing = true;
    const events = [...this.buffer];
    this.buffer = [];

    try {
      await this.onFlush(events);
      await this.clearPersistedEvents();
    } catch {
      // Put events back on failure (prepend so order is preserved)
      this.buffer = [...events, ...this.buffer];
      // Re-trim to max size
      if (this.buffer.length > this.maxSize) {
        this.buffer = this.buffer.slice(this.buffer.length - this.maxSize);
      }
    } finally {
      this.flushing = false;
    }
  }

  async persistEvents(): Promise<void> {
    if (!this.storage || this.buffer.length === 0) return;
    try {
      await this.storage.setItem(this.storageKey, JSON.stringify(this.buffer));
    } catch {
      // Storage write failure is non-fatal
    }
  }

  async restoreEvents(): Promise<void> {
    if (!this.storage) return;
    try {
      const stored = await this.storage.getItem(this.storageKey);
      if (stored) {
        const events: ObservabilityEvent[] = JSON.parse(stored);
        this.buffer = [...events, ...this.buffer].slice(0, this.maxSize);
        await this.storage.removeItem(this.storageKey);
      }
    } catch {
      // Corrupted storage is non-fatal
    }
  }

  private async clearPersistedEvents(): Promise<void> {
    if (!this.storage) return;
    try {
      await this.storage.removeItem(this.storageKey);
    } catch {
      // Non-fatal
    }
  }

  private startInterval(ms: number): void {
    this.intervalId = setInterval(() => {
      void this.flush();
    }, ms);
  }

  size(): number {
    return this.buffer.length;
  }

  getEvents(): readonly ObservabilityEvent[] {
    return this.buffer;
  }

  clear(): void {
    this.buffer = [];
  }

  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
