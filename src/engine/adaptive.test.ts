import { describe, expect, it } from 'vitest';
import { AdaptiveDifficulty } from './adaptive';

describe('AdaptiveDifficulty', () => {
  it('rises after 3 correct in a row, capped at max', () => {
    const a = new AdaptiveDifficulty(2, 1, 3);
    a.record(true); a.record(true);
    expect(a.level).toBe(2);
    a.record(true);
    expect(a.level).toBe(3);
    [1, 2, 3].forEach(() => a.record(true));
    expect(a.level).toBe(3);
  });
  it('drops after 2 wrong in a row, and a correct answer resets the count', () => {
    const a = new AdaptiveDifficulty(3);
    a.record(false); a.record(true); a.record(false);
    expect(a.level).toBe(3);
    a.record(false);
    expect(a.level).toBe(2);
  });
});
