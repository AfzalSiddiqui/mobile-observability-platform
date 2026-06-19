/**
 * FNV-1a hash for deterministic sampling.
 * Returns a value between 0 and 1.
 */
export function fnv1aHash(input: string): number {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0; // FNV prime, keep as uint32
  }
  return (hash >>> 0) / 0xffffffff;
}

/**
 * Determine whether a given identifier should be sampled at the specified rate.
 *
 * @param rate - Sampling rate 0.0 (never) to 1.0 (always)
 * @param identifier - Stable identifier for deterministic sampling
 * @param deterministic - If true, use hash-based sampling; otherwise random
 */
export function shouldSample(
  rate: number,
  identifier?: string,
  deterministic: boolean = true,
): boolean {
  if (rate >= 1) return true;
  if (rate <= 0) return false;

  if (deterministic && identifier) {
    return fnv1aHash(identifier) < rate;
  }

  return Math.random() < rate;
}
