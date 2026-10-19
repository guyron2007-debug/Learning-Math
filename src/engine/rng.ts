export type Rng = () => number;

/** Seeded PRNG, used by tests to make generators reproducible. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const defaultRng: Rng = Math.random;

export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Random integer in [min, max] that is not zero and not in `exclude`. */
export function randNonZero(rng: Rng, min: number, max: number, exclude: number[] = []): number {
  for (let i = 0; i < 1000; i++) {
    const n = randInt(rng, min, max);
    if (n !== 0 && !exclude.includes(n)) return n;
  }
  throw new Error(`randNonZero: no value in [${min}, ${max}]`);
}

/** Random integer with |n| in [min, max] and a random sign. */
export function randSigned(rng: Rng, min: number, max: number): number {
  const n = randInt(rng, min, max);
  return rng() < 0.5 ? -n : n;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
