export type LifecycleState = 'inactive' | 'initializing' | 'active' | 'background' | 'shutting_down' | 'shutdown';

export const LIFECYCLE_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  inactive: ['initializing'],
  initializing: ['active'],
  active: ['background', 'shutting_down'],
  background: ['active', 'shutting_down'],
  shutting_down: ['shutdown'],
  shutdown: ['initializing'],
};
