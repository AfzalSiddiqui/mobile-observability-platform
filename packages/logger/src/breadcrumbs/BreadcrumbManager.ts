import { Breadcrumb, BreadcrumbCategory } from '@observability/core';

export class BreadcrumbManager {
  private breadcrumbs: Breadcrumb[] = [];
  private readonly maxBreadcrumbs: number;

  constructor(maxBreadcrumbs: number = 50) {
    this.maxBreadcrumbs = maxBreadcrumbs;
  }

  add(
    category: BreadcrumbCategory,
    message: string,
    level: Breadcrumb['level'] = 'info',
    data?: Record<string, unknown>,
  ): void {
    const breadcrumb: Breadcrumb = {
      timestamp: Date.now(),
      category,
      message,
      level,
      data,
    };

    this.breadcrumbs.push(breadcrumb);

    // Circular buffer: drop oldest
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(
        this.breadcrumbs.length - this.maxBreadcrumbs,
      );
    }
  }

  getAll(): readonly Breadcrumb[] {
    return this.breadcrumbs;
  }

  getRecent(count: number): Breadcrumb[] {
    return this.breadcrumbs.slice(-count);
  }

  clear(): void {
    this.breadcrumbs = [];
  }

  size(): number {
    return this.breadcrumbs.length;
  }
}
