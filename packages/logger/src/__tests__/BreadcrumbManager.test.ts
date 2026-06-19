import { BreadcrumbManager } from '../breadcrumbs/BreadcrumbManager';

describe('BreadcrumbManager', () => {
  it('should add breadcrumbs', () => {
    const mgr = new BreadcrumbManager(10);
    mgr.add('log', 'test message');
    expect(mgr.size()).toBe(1);
    expect(mgr.getAll()[0].message).toBe('test message');
  });

  it('should enforce max breadcrumbs (circular buffer)', () => {
    const mgr = new BreadcrumbManager(3);
    mgr.add('log', 'a');
    mgr.add('log', 'b');
    mgr.add('log', 'c');
    mgr.add('log', 'd');
    expect(mgr.size()).toBe(3);
    expect(mgr.getAll()[0].message).toBe('b');
  });

  it('should return recent breadcrumbs', () => {
    const mgr = new BreadcrumbManager(10);
    mgr.add('log', 'a');
    mgr.add('log', 'b');
    mgr.add('log', 'c');
    const recent = mgr.getRecent(2);
    expect(recent).toHaveLength(2);
    expect(recent[0].message).toBe('b');
    expect(recent[1].message).toBe('c');
  });

  it('should clear breadcrumbs', () => {
    const mgr = new BreadcrumbManager(10);
    mgr.add('log', 'test');
    mgr.clear();
    expect(mgr.size()).toBe(0);
  });

  it('should set timestamp on breadcrumbs', () => {
    const mgr = new BreadcrumbManager(10);
    mgr.add('navigation', 'page load');
    expect(mgr.getAll()[0].timestamp).toBeGreaterThan(0);
  });

  it('should accept optional data', () => {
    const mgr = new BreadcrumbManager(10);
    mgr.add('network', 'GET /api', 'info', { status: 200 });
    expect(mgr.getAll()[0].data).toEqual({ status: 200 });
  });
});
