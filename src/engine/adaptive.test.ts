import { describe, expect, it } from 'vitest';
import { AdaptiveDifficulty, levelAdaptive } from './adaptive';

describe('AdaptiveDifficulty', () => {
  it('rises after 2 correct in a row, capped at max', () => {
    const a = new AdaptiveDifficulty(2, 1, 3);
    a.record(true);
    expect(a.level).toBe(2);
    a.record(true);
    expect(a.level).toBe(3);
    [1, 2, 3, 4].forEach(() => a.record(true));
    expect(a.level).toBe(3);
  });
  it('drops after 2 wrong in a row, and a correct answer resets the count', () => {
    const a = new AdaptiveDifficulty(3);
    a.record(false); a.record(true); a.record(false);
    expect(a.level).toBe(3);
    a.record(false);
    expect(a.level).toBe(2);
  });
  it('a level resumes where she finished it, never below its start', () => {
    const level = { startDifficulty: 3 as const, maxDifficulty: 5 as const };
    expect(levelAdaptive(level, undefined).level).toBe(3);
    expect(levelAdaptive(level, 5).level).toBe(5);
    expect(levelAdaptive(level, 1).level).toBe(3);
    // Two misses in a row ease off one step at most.
    const a = levelAdaptive(level, undefined);
    [1, 2, 3, 4, 5, 6].forEach(() => a.record(false));
    expect(a.level).toBe(2);
  });
});
