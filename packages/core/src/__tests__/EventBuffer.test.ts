import { EventBuffer } from '../EventBuffer';
import { ObservabilityEvent } from '../types/events';
import { InMemoryStorage } from '../StorageAdapter';

function makeEvent(id: string): ObservabilityEvent {
  return {
    id,
    type: 'log',
    severity: 'info',
    timestamp: Date.now(),
    sessionId: 'test-session',
    data: { message: `event-${id}` },
  };
}

describe('EventBuffer', () => {
  it('should buffer events', () => {
    const onFlush = jest.fn().mockResolvedValue(undefined);
    const buffer = new EventBuffer({
      maxSize: 100,
      flushStrategy: 'manual',
      onFlush,
    });
    buffer.add(makeEvent('1'));
    buffer.add(makeEvent('2'));
    expect(buffer.size()).toBe(2);
    buffer.destroy();
  });

  it('should drop oldest events when full (circular buffer)', () => {
    const onFlush = jest.fn().mockResolvedValue(undefined);
    const buffer = new EventBuffer({
      maxSize: 2,
      flushStrategy: 'manual',
      onFlush,
    });
    buffer.add(makeEvent('1'));
    buffer.add(makeEvent('2'));
    buffer.add(makeEvent('3'));
    expect(buffer.size()).toBe(2);
    expect(buffer.getEvents()[0].id).toBe('2');
    buffer.destroy();
  });

  it('should flush on count threshold', async () => {
    const onFlush = jest.fn().mockResolvedValue(undefined);
    const buffer = new EventBuffer({
      maxSize: 100,
      flushStrategy: 'count',
      flushThreshold: 2,
      onFlush,
    });
    buffer.add(makeEvent('1'));
    expect(onFlush).not.toHaveBeenCalled();
    buffer.add(makeEvent('2'));
    // Allow async flush to complete
    await new Promise((r) => setTimeout(r, 10));
    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: '1' }),
      expect.objectContaining({ id: '2' }),
    ]));
    buffer.destroy();
  });

  it('should flush immediately with immediate strategy', async () => {
    const onFlush = jest.fn().mockResolvedValue(undefined);
    const buffer = new EventBuffer({
      maxSize: 100,
      flushStrategy: 'immediate',
      onFlush,
    });
    buffer.add(makeEvent('1'));
    await new Promise((r) => setTimeout(r, 10));
    expect(onFlush).toHaveBeenCalledTimes(1);
    buffer.destroy();
  });

  it('should restore events back on flush failure', async () => {
    const onFlush = jest.fn().mockRejectedValue(new Error('fail'));
    const buffer = new EventBuffer({
      maxSize: 100,
      flushStrategy: 'manual',
      onFlush,
    });
    buffer.add(makeEvent('1'));
    buffer.add(makeEvent('2'));
    await buffer.flush();
    expect(buffer.size()).toBe(2);
    buffer.destroy();
  });

  it('should persist and restore events via storage', async () => {
    const storage = new InMemoryStorage();
    const onFlush = jest.fn().mockResolvedValue(undefined);

    const buffer1 = new EventBuffer({
      maxSize: 100,
      flushStrategy: 'manual',
      storage,
      onFlush,
    });
    buffer1.add(makeEvent('1'));
    buffer1.add(makeEvent('2'));
    await buffer1.persistEvents();
    buffer1.destroy();

    const buffer2 = new EventBuffer({
      maxSize: 100,
      flushStrategy: 'manual',
      storage,
      onFlush,
    });
    await buffer2.restoreEvents();
    expect(buffer2.size()).toBe(2);
    buffer2.destroy();
  });

  it('should clear buffer', () => {
    const onFlush = jest.fn().mockResolvedValue(undefined);
    const buffer = new EventBuffer({
      maxSize: 100,
      flushStrategy: 'manual',
      onFlush,
    });
    buffer.add(makeEvent('1'));
    buffer.clear();
    expect(buffer.size()).toBe(0);
    buffer.destroy();
  });
});
