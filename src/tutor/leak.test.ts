import { describe, expect, it } from 'vitest';
import { findLeak } from './leak';

describe('findLeak', () => {
  it('catches the answer in any equivalent form', () => {
    expect(findLeak('אז $x = 4$', { x: 4 })).toBe('x = 4');
    expect(findLeak('$x = \\frac{8}{2}$', { x: 4 })).not.toBeNull();
    expect(findLeak('$4 = x$', { x: 4 })).not.toBeNull();
    expect(findLeak('$x > 2 + 2$', { x: 4 })).not.toBeNull();
    expect(findLeak('$(x, y) = (1, -3)$', { x: 1, y: -3 })).not.toBeNull();
    expect(findLeak('$y = -3$', { x: 1, y: -3 })).not.toBeNull();
  });
  it('ignores intermediate results, coefficients and blanks', () => {
    expect(findLeak('$3x = 12$', { x: 4 })).toBeNull();
    expect(findLeak('חלקי ב-$4$', { x: 4 })).toBeNull();
    expect(findLeak('$x = \\frac{12}{\\square}$', { x: 4 })).toBeNull();
    expect(findLeak('$x = 5$', { x: 4 })).toBeNull();
    expect(findLeak('$x \\neq 4$', { x: 4 })).toBeNull();
  });
});
