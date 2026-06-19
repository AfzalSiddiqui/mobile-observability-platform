import { EventBus } from '../EventBus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('should call registered listeners', () => {
    const handler = jest.fn();
    bus.on('test', handler);
    bus.emit('test', { value: 1 });
    expect(handler).toHaveBeenCalledWith({ value: 1 });
  });

  it('should support multiple listeners', () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    bus.on('test', h1);
    bus.on('test', h2);
    bus.emit('test', 'data');
    expect(h1).toHaveBeenCalledWith('data');
    expect(h2).toHaveBeenCalledWith('data');
  });

  it('should unsubscribe via returned function', () => {
    const handler = jest.fn();
    const unsub = bus.on('test', handler);
    unsub();
    bus.emit('test', 'data');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should support once listeners', () => {
    const handler = jest.fn();
    bus.once('test', handler);
    bus.emit('test', 'first');
    bus.emit('test', 'second');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('first');
  });

  it('should support wildcard listeners', () => {
    const handler = jest.fn();
    bus.on('*', handler);
    bus.emit('foo', 'a');
    bus.emit('bar', 'b');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should not trigger wildcard for wildcard emit', () => {
    const handler = jest.fn();
    bus.on('*', handler);
    bus.emit('*', 'data');
    // Wildcard listener should fire as a regular listener for '*' event,
    // but not as a wildcard (since event === '*')
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should isolate listener errors', () => {
    const bad = jest.fn(() => { throw new Error('boom'); });
    const good = jest.fn();
    bus.on('test', bad);
    bus.on('test', good);
    expect(() => bus.emit('test', 'data')).not.toThrow();
    expect(good).toHaveBeenCalled();
  });

  it('should remove specific listener with off', () => {
    const handler = jest.fn();
    bus.on('test', handler);
    bus.off('test', handler);
    bus.emit('test', 'data');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should remove all listeners', () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    bus.on('a', h1);
    bus.on('b', h2);
    bus.removeAllListeners();
    bus.emit('a', 1);
    bus.emit('b', 2);
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  it('should remove listeners for specific event', () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    bus.on('a', h1);
    bus.on('b', h2);
    bus.removeAllListeners('a');
    bus.emit('a', 1);
    bus.emit('b', 2);
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });

  it('should report listener count', () => {
    bus.on('test', jest.fn());
    bus.on('test', jest.fn());
    bus.once('test', jest.fn());
    expect(bus.listenerCount('test')).toBe(3);
  });
});
