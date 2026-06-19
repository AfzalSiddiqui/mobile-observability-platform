import { generateEventId, generateSessionId, generateId } from '../IdGenerator';

describe('IdGenerator', () => {
  it('should generate unique event IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateEventId());
    }
    expect(ids.size).toBe(1000);
  });

  it('should generate session IDs in UUID-like format', () => {
    const id = generateSessionId();
    // UUID format: 8-4-4-4-12
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('should generate unique session IDs', () => {
    const a = generateSessionId();
    const b = generateSessionId();
    expect(a).not.toBe(b);
  });

  it('generateId should return a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});
