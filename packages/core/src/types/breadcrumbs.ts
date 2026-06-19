export type BreadcrumbCategory =
  | 'navigation'
  | 'user_action'
  | 'network'
  | 'log'
  | 'error'
  | 'console'
  | 'custom';

export interface Breadcrumb {
  timestamp: number;
  category: BreadcrumbCategory;
  message: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  data?: Record<string, unknown>;
}
