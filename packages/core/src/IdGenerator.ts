/**
 * Lightweight ID generation without external dependencies.
 * Uses timestamp + random bytes for uniqueness.
 */

function randomHex(bytes: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < bytes * 2; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
}

/** Generate a unique event ID (compact, 24 chars) */
export function generateEventId(): string {
  const timestamp = Date.now().toString(16);
  const random = randomHex(4);
  return `${timestamp}-${random}`;
}

/** Generate a session ID (UUID v4-like format) */
export function generateSessionId(): string {
  const s = randomHex(16);
  return [
    s.slice(0, 8),
    s.slice(8, 12),
    '4' + s.slice(13, 16),
    ((parseInt(s[16], 16) & 0x3) | 0x8).toString(16) + s.slice(17, 20),
    s.slice(20, 32),
  ].join('-');
}

/** Generate a generic unique ID */
export function generateId(): string {
  return generateEventId();
}
