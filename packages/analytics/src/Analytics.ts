import { EventBus, generateEventId } from '@observability/core';
import {
  AnalyticsEntry,
  AnalyticsProcessor,
  TrackEventInput,
  ScreenViewInput,
} from './types';
import { AnalyticsProvider } from './providers/AnalyticsProvider';

export class Analytics {
  private readonly processors: AnalyticsProcessor[];
  private readonly providers: AnalyticsProvider[];
  private readonly eventBus: EventBus | null;
  private readonly sessionId: string;
  private userId: string | undefined;
  private userProperties: Record<string, unknown> = {};

  constructor(options: {
    processors?: AnalyticsProcessor[];
    providers?: AnalyticsProvider[];
    eventBus?: EventBus;
    sessionId?: string;
  }) {
    this.processors = options.processors ?? [];
    this.providers = options.providers ?? [];
    this.eventBus = options.eventBus ?? null;
    this.sessionId = options.sessionId ?? '';
  }

  trackEvent(name: string, properties?: Record<string, unknown>): void;
  trackEvent(input: TrackEventInput): void;
  trackEvent(
    nameOrInput: string | TrackEventInput,
    properties?: Record<string, unknown>,
  ): void {
    const input: TrackEventInput =
      typeof nameOrInput === 'string'
        ? { name: nameOrInput, properties }
        : nameOrInput;

    let entry: AnalyticsEntry | null = {
      type: 'track',
      name: input.name,
      properties: { ...input.properties },
      userProperties: { ...this.userProperties },
      userId: this.userId,
      tags: input.tags ?? {},
    };

    entry = this.runProcessors(entry);
    if (!entry) return;

    for (const provider of this.providers) {
      try {
        provider.trackEvent(entry);
      } catch {
        // Provider errors shouldn't break tracking
      }
    }

    this.emitEvent(entry);
  }

  trackScreenView(screenName: string, properties?: Record<string, unknown>): void;
  trackScreenView(input: ScreenViewInput): void;
  trackScreenView(
    nameOrInput: string | ScreenViewInput,
    properties?: Record<string, unknown>,
  ): void {
    const input: ScreenViewInput =
      typeof nameOrInput === 'string'
        ? { screenName: nameOrInput, properties }
        : nameOrInput;

    let entry: AnalyticsEntry | null = {
      type: 'screen',
      name: input.screenName,
      properties: { ...input.properties },
      userProperties: { ...this.userProperties },
      userId: this.userId,
      tags: input.tags ?? {},
    };

    entry = this.runProcessors(entry);
    if (!entry) return;

    for (const provider of this.providers) {
      try {
        provider.trackScreenView(entry);
      } catch {
        // Provider errors shouldn't break tracking
      }
    }

    this.emitEvent(entry);
  }

  setUserIdentity(userId: string): void {
    this.userId = userId;
  }

  setUserProperties(properties: Record<string, unknown>): void {
    this.userProperties = { ...this.userProperties, ...properties };
    for (const provider of this.providers) {
      try {
        provider.setUserProperties(this.userProperties);
      } catch {
        // Provider errors shouldn't break user property updates
      }
    }
  }

  resetUser(): void {
    this.userId = undefined;
    this.userProperties = {};
  }

  async flush(): Promise<void> {
    const results = await Promise.allSettled(
      this.providers.map((p) => p.flush()),
    );
    const allFailed = results.every((r) => r.status === 'rejected');
    if (allFailed && results.length > 0) {
      throw new Error('All analytics providers failed to flush');
    }
  }

  private runProcessors(entry: AnalyticsEntry): AnalyticsEntry | null {
    let current: AnalyticsEntry | null = entry;
    for (const processor of this.processors) {
      if (!current) break;
      try {
        current = processor.process(current);
      } catch {
        // Processor errors shouldn't prevent tracking
      }
    }
    return current;
  }

  private emitEvent(entry: AnalyticsEntry): void {
    if (this.eventBus && this.sessionId) {
      this.eventBus.emit('analytics', {
        id: generateEventId(),
        type: entry.type === 'track' ? 'user_action' : 'navigation',
        severity: 'info' as const,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        data: {
          name: entry.name,
          properties: entry.properties,
          userId: entry.userId,
        },
        tags: entry.tags,
      });
    }
  }
}
