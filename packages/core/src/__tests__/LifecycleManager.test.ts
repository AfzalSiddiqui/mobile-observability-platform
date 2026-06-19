import { LifecycleManager } from '../LifecycleManager';
import { EventBus } from '../EventBus';

describe('LifecycleManager', () => {
  let bus: EventBus;
  let lm: LifecycleManager;

  beforeEach(() => {
    bus = new EventBus();
    lm = new LifecycleManager(bus);
  });

  it('should start in inactive state', () => {
    expect(lm.getState()).toBe('inactive');
  });

  it('should allow valid transitions', () => {
    lm.transition('initializing');
    expect(lm.getState()).toBe('initializing');
    lm.transition('active');
    expect(lm.getState()).toBe('active');
  });

  it('should reject invalid transitions', () => {
    expect(() => lm.transition('active')).toThrow('Invalid lifecycle transition');
  });

  it('should emit lifecycle events', () => {
    const handler = jest.fn();
    bus.on('lifecycle', handler);
    lm.transition('initializing');
    expect(handler).toHaveBeenCalledWith({ from: 'inactive', to: 'initializing' });
  });

  it('should support background/active cycle', () => {
    lm.transition('initializing');
    lm.transition('active');
    lm.transition('background');
    expect(lm.getState()).toBe('background');
    lm.transition('active');
    expect(lm.getState()).toBe('active');
  });

  it('should support shutdown from active', () => {
    lm.transition('initializing');
    lm.transition('active');
    lm.transition('shutting_down');
    lm.transition('shutdown');
    expect(lm.getState()).toBe('shutdown');
  });

  it('should allow re-init after shutdown', () => {
    lm.transition('initializing');
    lm.transition('active');
    lm.transition('shutting_down');
    lm.transition('shutdown');
    lm.transition('initializing');
    expect(lm.getState()).toBe('initializing');
  });
});
