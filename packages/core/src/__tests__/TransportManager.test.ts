import { TransportManager } from '../TransportManager';
import { Transport } from '../types/transport';
import { ObservabilityEvent } from '../types/events';

function makeEvent(id: string): ObservabilityEvent {
  return {
    id, type: 'log', severity: 'info',
    timestamp: Date.now(), sessionId: 's', data: {},
  };
}

describe('TransportManager', () => {
  it('should have NoopTransport by default', () => {
    const tm = new TransportManager();
    expect(tm.getTransports()).toHaveLength(1);
    expect(tm.getTransports()[0].name).toBe('noop');
  });

  it('should replace noop when adding a real transport', () => {
    const tm = new TransportManager();
    const mock: Transport = {
      name: 'mock',
      send: jest.fn().mockResolvedValue(undefined),
    };
    tm.addTransport(mock);
    expect(tm.getTransports()).toHaveLength(1);
    expect(tm.getTransports()[0].name).toBe('mock');
  });

  it('should fan-out send to all transports', async () => {
    const tm = new TransportManager();
    const t1: Transport = { name: 't1', send: jest.fn().mockResolvedValue(undefined) };
    const t2: Transport = { name: 't2', send: jest.fn().mockResolvedValue(undefined) };
    tm.addTransport(t1);
    tm.addTransport(t2);

    const events = [makeEvent('1')];
    await tm.send(events);
    expect(t1.send).toHaveBeenCalledWith(events);
    expect(t2.send).toHaveBeenCalledWith(events);
  });

  it('should throw when all transports fail', async () => {
    const tm = new TransportManager();
    const failing: Transport = {
      name: 'fail',
      send: jest.fn().mockRejectedValue(new Error('fail')),
    };
    tm.addTransport(failing);
    await expect(tm.send([makeEvent('1')])).rejects.toThrow('All transports failed');
  });

  it('should not throw when at least one transport succeeds', async () => {
    const tm = new TransportManager();
    const ok: Transport = { name: 'ok', send: jest.fn().mockResolvedValue(undefined) };
    const fail: Transport = { name: 'fail', send: jest.fn().mockRejectedValue(new Error()) };
    tm.addTransport(ok);
    tm.addTransport(fail);
    await expect(tm.send([makeEvent('1')])).resolves.not.toThrow();
  });

  it('should initialize and shutdown transports', async () => {
    const tm = new TransportManager();
    const transport: Transport = {
      name: 'test',
      initialize: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
    };
    tm.addTransport(transport);
    await tm.initialize();
    expect(transport.initialize).toHaveBeenCalled();
    await tm.shutdown();
    expect(transport.shutdown).toHaveBeenCalled();
  });

  it('should skip empty event arrays', async () => {
    const tm = new TransportManager();
    const mock: Transport = { name: 'mock', send: jest.fn() };
    tm.addTransport(mock);
    await tm.send([]);
    expect(mock.send).not.toHaveBeenCalled();
  });
});
