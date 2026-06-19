import { ObservabilityEvent } from './events';

export interface PluginContext {
  emit(event: ObservabilityEvent): void;
  getSessionId(): string;
  generateId(): string;
}

export interface Plugin {
  readonly name: string;
  readonly version: string;
  readonly dependencies?: string[];

  initialize?(context: PluginContext): Promise<void> | void;
  onEvent?(event: ObservabilityEvent): ObservabilityEvent | null;
  shutdown?(): Promise<void> | void;
}
