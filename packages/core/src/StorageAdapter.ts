import { StorageAdapter } from './types/storage';

/**
 * In-memory storage fallback when AsyncStorage is unavailable.
 */
export class InMemoryStorage implements StorageAdapter {
  private store: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}

/**
 * Default storage adapter that tries to lazily require AsyncStorage,
 * falling back to in-memory storage if unavailable.
 */
export class DefaultStorageAdapter implements StorageAdapter {
  private delegate: StorageAdapter | null = null;

  private getDelegate(): StorageAdapter {
    if (this.delegate) return this.delegate;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      this.delegate = AsyncStorage as StorageAdapter;
    } catch {
      this.delegate = new InMemoryStorage();
    }
    return this.delegate;
  }

  async getItem(key: string): Promise<string | null> {
    return this.getDelegate().getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    return this.getDelegate().setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    return this.getDelegate().removeItem(key);
  }

  async getAllKeys(): Promise<string[]> {
    const delegate = this.getDelegate();
    if (delegate.getAllKeys) {
      return delegate.getAllKeys();
    }
    return [];
  }
}
