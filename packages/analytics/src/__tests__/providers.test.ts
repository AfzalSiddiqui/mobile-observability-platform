import { ConsoleProvider } from '../providers/ConsoleProvider';
import { AnalyticsEntry } from '../types';

function makeEntry(overrides?: Partial<AnalyticsEntry>): AnalyticsEntry {
  return {
    type: 'track',
    name: 'test_event',
    properties: {},
    userProperties: {},
    tags: {},
    ...overrides,
  };
}

describe('ConsoleProvider', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('should log track events', () => {
    const provider = new ConsoleProvider();
    provider.trackEvent(makeEntry({ name: 'button_clicked' }));
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain('[Analytics] EVENT: button_clicked');
  });

  it('should log screen view events', () => {
    const provider = new ConsoleProvider();
    provider.trackScreenView(makeEntry({ type: 'screen', name: 'HomeScreen' }));
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain('[Analytics] SCREEN: HomeScreen');
  });

  it('should include properties in event output', () => {
    const provider = new ConsoleProvider();
    provider.trackEvent(makeEntry({
      name: 'purchase',
      properties: { amount: 99 },
    }));
    expect(logSpy.mock.calls[0][0]).toContain('"amount":99');
  });

  it('should log user properties', () => {
    const provider = new ConsoleProvider();
    provider.setUserProperties({ tier: 'premium' });
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain('[Analytics] USER_PROPS:');
    expect(logSpy.mock.calls[0][0]).toContain('"tier":"premium"');
  });

  it('should flush without error', async () => {
    const provider = new ConsoleProvider();
    await expect(provider.flush()).resolves.not.toThrow();
  });

  it('should shutdown without error', async () => {
    const provider = new ConsoleProvider();
    await expect(provider.shutdown()).resolves.not.toThrow();
  });
});
