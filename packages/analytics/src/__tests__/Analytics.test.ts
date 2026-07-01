import { Analytics } from '../Analytics';
import { EventBus } from '@observability/core';
import { AnalyticsProvider } from '../providers/AnalyticsProvider';
import { AnalyticsEntry } from '../types';
import { TimestampProcessor } from '../processors/TimestampProcessor';


function createMockProvider(): AnalyticsProvider & {
  trackEvent: jest.Mock;
  trackScreenView: jest.Mock;
  setUserProperties: jest.Mock;
  flush: jest.Mock;
  shutdown: jest.Mock;
} {
  return {
    name: 'mock',
    trackEvent: jest.fn(),
    trackScreenView: jest.fn(),
    setUserProperties: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
  };
}

describe('Analytics', () => {
  it('should track events with string name', () => {
    const provider = createMockProvider();
    const analytics = new Analytics({
      providers: [provider],
    });

    analytics.trackEvent('button_clicked', { id: 'cta' });
    expect(provider.trackEvent).toHaveBeenCalledTimes(1);
    const entry: AnalyticsEntry = provider.trackEvent.mock.calls[0][0];
    expect(entry.name).toBe('button_clicked');
    expect(entry.properties.id).toBe('cta');
    expect(entry.type).toBe('track');
  });

  it('should track events with input object', () => {
    const provider = createMockProvider();
    const analytics = new Analytics({
      providers: [provider],
    });

    analytics.trackEvent({ name: 'purchase', properties: { amount: 99 }, tags: { source: 'web' } });
    expect(provider.trackEvent).toHaveBeenCalledTimes(1);
    const entry: AnalyticsEntry = provider.trackEvent.mock.calls[0][0];
    expect(entry.name).toBe('purchase');
    expect(entry.properties.amount).toBe(99);
    expect(entry.tags.source).toBe('web');
  });

  it('should track screen views with string name', () => {
    const provider = createMockProvider();
    const analytics = new Analytics({
      providers: [provider],
    });

    analytics.trackScreenView('HomeScreen');
    expect(provider.trackScreenView).toHaveBeenCalledTimes(1);
    const entry: AnalyticsEntry = provider.trackScreenView.mock.calls[0][0];
    expect(entry.name).toBe('HomeScreen');
    expect(entry.type).toBe('screen');
  });

  it('should track screen views with input object', () => {
    const provider = createMockProvider();
    const analytics = new Analytics({
      providers: [provider],
    });

    analytics.trackScreenView({ screenName: 'Settings', properties: { tab: 'general' } });
    expect(provider.trackScreenView).toHaveBeenCalledTimes(1);
    const entry: AnalyticsEntry = provider.trackScreenView.mock.calls[0][0];
    expect(entry.name).toBe('Settings');
    expect(entry.properties.tab).toBe('general');
  });

  it('should set user identity', () => {
    const provider = createMockProvider();
    const analytics = new Analytics({
      providers: [provider],
    });

    analytics.setUserIdentity('user-123');
    analytics.trackEvent('action');
    const entry: AnalyticsEntry = provider.trackEvent.mock.calls[0][0];
    expect(entry.userId).toBe('user-123');
  });

  it('should set and merge user properties', () => {
    const provider = createMockProvider();
    const analytics = new Analytics({
      providers: [provider],
    });

    analytics.setUserProperties({ tier: 'premium' });
    expect(provider.setUserProperties).toHaveBeenCalledWith({ tier: 'premium' });

    analytics.setUserProperties({ plan: 'annual' });
    expect(provider.setUserProperties).toHaveBeenCalledWith({ tier: 'premium', plan: 'annual' });

    analytics.trackEvent('action');
    const entry: AnalyticsEntry = provider.trackEvent.mock.calls[0][0];
    expect(entry.userProperties).toEqual({ tier: 'premium', plan: 'annual' });
  });

  it('should reset user', () => {
    const provider = createMockProvider();
    const analytics = new Analytics({
      providers: [provider],
    });

    analytics.setUserIdentity('user-123');
    analytics.setUserProperties({ tier: 'premium' });
    analytics.resetUser();

    analytics.trackEvent('action');
    const entry: AnalyticsEntry = provider.trackEvent.mock.calls[0][0];
    expect(entry.userId).toBeUndefined();
    expect(entry.userProperties).toEqual({});
  });

  it('should emit events to event bus', () => {
    const bus = new EventBus();
    const handler = jest.fn();
    bus.on('analytics', handler);

    const analytics = new Analytics({
      eventBus: bus,
      sessionId: 'test-session',
    });

    analytics.trackEvent('click');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].data.name).toBe('click');
  });

  it('should emit screen view events to event bus', () => {
    const bus = new EventBus();
    const handler = jest.fn();
    bus.on('analytics', handler);

    const analytics = new Analytics({
      eventBus: bus,
      sessionId: 'test-session',
    });

    analytics.trackScreenView('HomeScreen');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].type).toBe('navigation');
  });

  it('should run processor pipeline', () => {
    const provider = createMockProvider();
    const analytics = new Analytics({
      processors: [new TimestampProcessor()],
      providers: [provider],
    });

    analytics.trackEvent('test');
    const entry: AnalyticsEntry = provider.trackEvent.mock.calls[0][0];
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should not throw if processor throws', () => {
    const badProcessor = {
      name: 'bad',
      process: () => { throw new Error('processor error'); },
    };

    const analytics = new Analytics({
      processors: [badProcessor],
    });

    expect(() => analytics.trackEvent('test')).not.toThrow();
  });

  it('should not throw if provider throws', () => {
    const badProvider = createMockProvider();
    badProvider.trackEvent.mockImplementation(() => { throw new Error('provider error'); });

    const analytics = new Analytics({
      providers: [badProvider],
    });

    expect(() => analytics.trackEvent('test')).not.toThrow();
  });

  it('should flush all providers', async () => {
    const provider1 = createMockProvider();
    const provider2 = createMockProvider();
    const analytics = new Analytics({
      providers: [provider1, provider2],
    });

    await analytics.flush();
    expect(provider1.flush).toHaveBeenCalledTimes(1);
    expect(provider2.flush).toHaveBeenCalledTimes(1);
  });

  it('should send to multiple providers', () => {
    const provider1 = createMockProvider();
    const provider2 = createMockProvider();
    const analytics = new Analytics({
      providers: [provider1, provider2],
    });

    analytics.trackEvent('test');
    expect(provider1.trackEvent).toHaveBeenCalledTimes(1);
    expect(provider2.trackEvent).toHaveBeenCalledTimes(1);
  });
});
