type EventHandler<T = unknown> = (data: T) => void;

export class EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private onceListeners: Map<string, Set<EventHandler>> = new Map();

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);

    return () => {
      this.off(event, handler);
    };
  }

  once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event)!.add(handler as EventHandler);

    return () => {
      this.onceListeners.get(event)?.delete(handler as EventHandler);
    };
  }

  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    this.listeners.get(event)?.delete(handler as EventHandler);
    this.onceListeners.get(event)?.delete(handler as EventHandler);
  }

  emit<T = unknown>(event: string, data: T): void {
    // Regular listeners
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch {
          // Isolate listener errors - don't break emission chain
        }
      }
    }

    // Once listeners
    const onceHandlers = this.onceListeners.get(event);
    if (onceHandlers) {
      const handlersCopy = [...onceHandlers];
      onceHandlers.clear();
      for (const handler of handlersCopy) {
        try {
          handler(data);
        } catch {
          // Isolate listener errors
        }
      }
    }

    // Wildcard listeners
    if (event !== '*') {
      const wildcardHandlers = this.listeners.get('*');
      if (wildcardHandlers) {
        for (const handler of wildcardHandlers) {
          try {
            handler(data);
          } catch {
            // Isolate listener errors
          }
        }
      }
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  listenerCount(event: string): number {
    return (this.listeners.get(event)?.size ?? 0) +
      (this.onceListeners.get(event)?.size ?? 0);
  }
}
