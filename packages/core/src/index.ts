// Types
export type {
  EventType,
  EventSeverity,
  LogEventData,
  ObservabilityEvent,
  BreadcrumbCategory,
  Breadcrumb,
  DeviceInfo,
  Transport,
  Plugin,
  PluginContext,
  LifecycleState,
  StorageAdapter,
} from './types';

export {
  createLogEvent,
  createErrorEvent,
  NoopTransport,
  LIFECYCLE_TRANSITIONS,
} from './types';

// Core modules
export { EventBus } from './EventBus';
export { EventBuffer } from './EventBuffer';
export type { FlushStrategy, EventBufferOptions } from './EventBuffer';
export { PluginRegistry } from './PluginRegistry';
export { TransportManager } from './TransportManager';
export { DefaultStorageAdapter, InMemoryStorage } from './StorageAdapter';
export { LifecycleManager } from './LifecycleManager';
export { generateEventId, generateSessionId, generateId } from './IdGenerator';

// SDK facade
export { ObservabilitySDK } from './ObservabilitySDK';
