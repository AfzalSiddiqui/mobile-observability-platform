import { Plugin, PluginContext } from './types/plugin';
import { ObservabilityEvent } from './types/events';

export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private initOrder: Plugin[] = [];
  private maxPlugins: number;

  constructor(maxPlugins: number = 20) {
    this.maxPlugins = maxPlugins;
  }

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }
    if (this.plugins.size >= this.maxPlugins) {
      throw new Error(`Maximum number of plugins (${this.maxPlugins}) reached`);
    }
    this.plugins.set(plugin.name, plugin);
  }

  async initializeAll(context: PluginContext): Promise<void> {
    this.initOrder = this.topologicalSort();

    for (const plugin of this.initOrder) {
      if (plugin.initialize) {
        try {
          await plugin.initialize(context);
        } catch (err) {
          throw new Error(
            `Plugin "${plugin.name}" failed to initialize: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
  }

  processEvent(event: ObservabilityEvent): ObservabilityEvent | null {
    let current: ObservabilityEvent | null = event;
    for (const plugin of this.initOrder) {
      if (!current) break;
      if (plugin.onEvent) {
        try {
          current = plugin.onEvent(current);
        } catch {
          // Plugin processing error shouldn't drop the event
        }
      }
    }
    return current;
  }

  async shutdownAll(): Promise<void> {
    // Shutdown in reverse init order
    const reversed = [...this.initOrder].reverse();
    for (const plugin of reversed) {
      if (plugin.shutdown) {
        try {
          await plugin.shutdown();
        } catch {
          // Best-effort shutdown
        }
      }
    }
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  private topologicalSort(): Plugin[] {
    const sorted: Plugin[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string): void => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular plugin dependency detected: ${name}`);
      }

      visiting.add(name);
      const plugin = this.plugins.get(name);
      if (!plugin) {
        throw new Error(`Missing plugin dependency: ${name}`);
      }

      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          if (!this.plugins.has(dep)) {
            throw new Error(
              `Plugin "${name}" depends on "${dep}" which is not registered`,
            );
          }
          visit(dep);
        }
      }

      visiting.delete(name);
      visited.add(name);
      sorted.push(plugin);
    };

    for (const name of this.plugins.keys()) {
      visit(name);
    }

    return sorted;
  }
}
