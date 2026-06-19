import { PluginRegistry } from '../PluginRegistry';
import { Plugin, PluginContext } from '../types/plugin';

function makePlugin(name: string, deps?: string[]): Plugin {
  return {
    name,
    version: '1.0.0',
    dependencies: deps,
    initialize: jest.fn(),
    onEvent: jest.fn((e) => e),
    shutdown: jest.fn(),
  };
}

const mockContext: PluginContext = {
  emit: jest.fn(),
  getSessionId: () => 'test-session',
  generateId: () => 'test-id',
};

describe('PluginRegistry', () => {
  it('should register and initialize plugins', async () => {
    const registry = new PluginRegistry();
    const plugin = makePlugin('test');
    registry.register(plugin);
    await registry.initializeAll(mockContext);
    expect(plugin.initialize).toHaveBeenCalledWith(mockContext);
  });

  it('should reject duplicate plugin names', () => {
    const registry = new PluginRegistry();
    registry.register(makePlugin('test'));
    expect(() => registry.register(makePlugin('test'))).toThrow('already registered');
  });

  it('should enforce max plugins', () => {
    const registry = new PluginRegistry(2);
    registry.register(makePlugin('a'));
    registry.register(makePlugin('b'));
    expect(() => registry.register(makePlugin('c'))).toThrow('Maximum');
  });

  it('should sort by dependencies', async () => {
    const registry = new PluginRegistry();
    const initOrder: string[] = [];

    const pluginA: Plugin = {
      name: 'a',
      version: '1.0.0',
      dependencies: ['b'],
      initialize: jest.fn(() => { initOrder.push('a'); }),
    };
    const pluginB: Plugin = {
      name: 'b',
      version: '1.0.0',
      initialize: jest.fn(() => { initOrder.push('b'); }),
    };

    registry.register(pluginA);
    registry.register(pluginB);
    await registry.initializeAll(mockContext);

    expect(initOrder).toEqual(['b', 'a']);
  });

  it('should detect circular dependencies', async () => {
    const registry = new PluginRegistry();
    registry.register({ name: 'a', version: '1.0.0', dependencies: ['b'] });
    registry.register({ name: 'b', version: '1.0.0', dependencies: ['a'] });
    await expect(registry.initializeAll(mockContext)).rejects.toThrow('Circular');
  });

  it('should detect missing dependencies', async () => {
    const registry = new PluginRegistry();
    registry.register({ name: 'a', version: '1.0.0', dependencies: ['missing'] });
    await expect(registry.initializeAll(mockContext)).rejects.toThrow('not registered');
  });

  it('should process events through plugin pipeline', async () => {
    const registry = new PluginRegistry();
    const plugin: Plugin = {
      name: 'tag',
      version: '1.0.0',
      onEvent: (e) => ({ ...e, tags: { ...e.tags, processed: 'true' } }),
    };
    registry.register(plugin);
    await registry.initializeAll(mockContext);

    const event = {
      id: '1', type: 'log' as const, severity: 'info' as const,
      timestamp: Date.now(), sessionId: 's', data: {},
    };
    const result = registry.processEvent(event);
    expect(result?.tags?.processed).toBe('true');
  });

  it('should allow plugin to filter (drop) event', async () => {
    const registry = new PluginRegistry();
    registry.register({
      name: 'filter',
      version: '1.0.0',
      onEvent: () => null,
    });
    await registry.initializeAll(mockContext);

    const event = {
      id: '1', type: 'log' as const, severity: 'info' as const,
      timestamp: Date.now(), sessionId: 's', data: {},
    };
    expect(registry.processEvent(event)).toBeNull();
  });

  it('should shutdown in reverse order', async () => {
    const order: string[] = [];
    const registry = new PluginRegistry();
    registry.register({
      name: 'a', version: '1.0.0',
      shutdown: () => { order.push('a'); },
    });
    registry.register({
      name: 'b', version: '1.0.0',
      shutdown: () => { order.push('b'); },
    });
    await registry.initializeAll(mockContext);
    await registry.shutdownAll();
    expect(order).toEqual(['b', 'a']);
  });
});
