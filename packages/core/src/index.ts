// Types
export {
  EventType,
  EventSeverity,
  LogEventData,
  ObservabilityEvent,
  createLogEvent,
  createErrorEvent,
  BreadcrumbCategory,
  Breadcrumb,
  DeviceInfo,
  Transport,
  NoopTransport,
  Plugin,
  PluginContext,
  LifecycleState,
  LIFECYCLE_TRANSITIONS,
  StorageAdapter,
} from './types';

// Core modules
export { EventBus } from './EventBus';
export { EventBuffer, FlushStrategy, EventBufferOptions } from './EventBuffer';
export { PluginRegistry } from './PluginRegistry';
export { TransportManager } from './TransportManager';
export { DefaultStorageAdapter, InMemoryStorage } from './StorageAdapter';
export { LifecycleManager } from './LifecycleManager';
export { generateEventId, generateSessionId, generateId } from './IdGenerator';

// SDK facade
export { ObservabilitySDK } from './ObservabilitySDK';
