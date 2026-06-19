import { ConfigManager, InitConfig, ObservabilityConfig } from '@observability/config';
import { ObservabilityEvent } from './types/events';
import { Transport } from './types/transport';
import { Plugin, PluginContext } from './types/plugin';
import { StorageAdapter } from './types/storage';
import { EventBus } from './EventBus';
import { EventBuffer } from './EventBuffer';
import { PluginRegistry } from './PluginRegistry';
import { TransportManager } from './TransportManager';
import { DefaultStorageAdapter } from './StorageAdapter';
import { LifecycleManager } from './LifecycleManager';
import { generateEventId, generateSessionId, generateId } from './IdGenerator';

export class ObservabilitySDK {
  private static instance: ObservabilitySDK | null = null;

  private configManager: ConfigManager;
  private eventBus: EventBus;
  private eventBuffer!: EventBuffer;
  private pluginRegistry!: PluginRegistry;
  private transportManager: TransportManager;
  private lifecycleManager: LifecycleManager;
  private storage: StorageAdapter;
  private sessionId: string;
  private initialized = false;

  private constructor() {
    this.configManager = ConfigManager.getInstance();
    this.eventBus = new EventBus();
    this.transportManager = new TransportManager();
    this.lifecycleManager = new LifecycleManager(this.eventBus);
    this.storage = new DefaultStorageAdapter();
    this.sessionId = generateSessionId();
  }

  static getInstance(): ObservabilitySDK {
    if (!ObservabilitySDK.instance) {
      ObservabilitySDK.instance = new ObservabilitySDK();
    }
    return ObservabilitySDK.instance;
  }

  static resetInstance(): void {
    if (ObservabilitySDK.instance) {
      ObservabilitySDK.instance.eventBus.removeAllListeners();
      ObservabilitySDK.instance.eventBuffer?.destroy();
    }
    ObservabilitySDK.instance = null;
    ConfigManager.resetInstance();
  }

  async init(initConfig: InitConfig): Promise<ObservabilityConfig> {
    if (this.initialized) {
      throw new Error('ObservabilitySDK is already initialized');
    }

    this.lifecycleManager.transition('initializing');

    const config = this.configManager.initialize(initConfig);

    this.pluginRegistry = new PluginRegistry(config.packages.core.maxPlugins);

    this.eventBuffer = new EventBuffer({
      maxSize: config.packages.core.maxBufferSize,
      flushStrategy: 'count',
      flushThreshold: config.packages.core.flushThreshold,
      flushInterval: config.packages.core.flushInterval,
      storage: config.packages.core.persistEvents ? this.storage : undefined,
      onFlush: (events) => this.transportManager.send(events),
    });

    // Restore any persisted events from previous session
    if (config.packages.core.persistEvents) {
      await this.eventBuffer.restoreEvents();
    }

    await this.transportManager.initialize();

    this.lifecycleManager.transition('active');
    this.lifecycleManager.startAppStateListener();

    // Persist events when going to background
    this.eventBus.on('lifecycle', (data: unknown) => {
      const { to } = data as { to: string };
      if (to === 'background') {
        void this.eventBuffer.persistEvents();
      }
    });

    this.initialized = true;
    return config;
  }

  async registerPlugin(plugin: Plugin): Promise<void> {
    this.pluginRegistry.register(plugin);

    if (this.initialized) {
      const context = this.createPluginContext();
      if (plugin.initialize) {
        await plugin.initialize(context);
      }
    }
  }

  async initializePlugins(): Promise<void> {
    const context = this.createPluginContext();
    await this.pluginRegistry.initializeAll(context);
  }

  addTransport(transport: Transport): void {
    this.transportManager.addTransport(transport);
  }

  emit(event: ObservabilityEvent): void {
    if (!this.initialized) return;

    // Run through plugin pipeline
    const processed = this.pluginRegistry.processEvent(event);
    if (!processed) return; // Plugin filtered the event

    this.eventBus.emit('event', processed);
    this.eventBuffer.add(processed);
  }

  async flush(): Promise<void> {
    if (this.eventBuffer) {
      await this.eventBuffer.flush();
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    this.lifecycleManager.stopAppStateListener();
    this.lifecycleManager.transition('shutting_down');

    // Flush remaining events
    await this.eventBuffer.flush();
    await this.eventBuffer.persistEvents();

    // Shutdown plugins and transports
    await this.pluginRegistry.shutdownAll();
    await this.transportManager.shutdown();

    this.eventBuffer.destroy();
    this.eventBus.removeAllListeners();

    this.lifecycleManager.transition('shutdown');
    this.initialized = false;
  }

  // Accessors
  getEventBus(): EventBus {
    return this.eventBus;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getConfig(): ObservabilityConfig {
    return this.configManager.getConfig();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getBuffer(): EventBuffer {
    return this.eventBuffer;
  }

  private createPluginContext(): PluginContext {
    return {
      emit: (event: ObservabilityEvent) => this.emit(event),
      getSessionId: () => this.sessionId,
      generateId: () => generateId(),
    };
  }
}

// Re-export ID generators for convenience
export { generateEventId, generateSessionId, generateId };
