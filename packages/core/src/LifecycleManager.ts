import { LifecycleState, LIFECYCLE_TRANSITIONS } from './types/lifecycle';
import { EventBus } from './EventBus';

type AppStateCallback = (state: string) => void;

export class LifecycleManager {
  private state: LifecycleState = 'inactive';
  private eventBus: EventBus;
  private appStateSubscription: { remove(): void } | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  getState(): LifecycleState {
    return this.state;
  }

  transition(to: LifecycleState): void {
    const allowed = LIFECYCLE_TRANSITIONS[this.state];
    if (!allowed.includes(to)) {
      throw new Error(
        `Invalid lifecycle transition: ${this.state} -> ${to}. Allowed: ${allowed.join(', ')}`,
      );
    }
    const from = this.state;
    this.state = to;
    this.eventBus.emit('lifecycle', { from, to });
  }

  /** Subscribe to RN AppState changes for background/foreground tracking */
  startAppStateListener(): void {
    try {
      // Dynamic require to avoid hard dependency on react-native
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AppState } = require('react-native');
      const handler: AppStateCallback = (nextState: string) => {
        if (this.state === 'active' && nextState === 'background') {
          this.transition('background');
        } else if (this.state === 'background' && nextState === 'active') {
          this.transition('active');
        }
      };
      this.appStateSubscription = AppState.addEventListener('change', handler);
    } catch {
      // react-native not available (e.g., in tests)
    }
  }

  stopAppStateListener(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}
