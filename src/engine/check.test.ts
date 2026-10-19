import { describe, expect, it } from 'vitest';
import { checkExpression, checkNumber, parseNumber } from './check';

describe('parseNumber', () => {
  it('accepts integers, decimals and fractions', () => {
    expect(parseNumber('7')).toBe(7);
    expect(parseNumber('−2')).toBe(-2);
    expect(parseNumber('1.5')).toBe(1.5);
    expect(parseNumber(' -3 / 4 ')).toBe(-0.75);
    expect(parseNumber('3/-4')).toBe(-0.75);
  });
  it('rejects junk and division by zero', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('x')).toBeNull();
    expect(parseNumber('3/0')).toBeNull();
    expect(parseNumber('1/2/3')).toBeNull();
  });
});

describe('checkNumber', () => {
  it('compares fractions and decimals by value', () => {
    expect(checkNumber('6/8', 0.75)).toBe(true);
    expect(checkNumber('0.75', 0.75)).toBe(true);
    expect(checkNumber('1/3', 1 / 3)).toBe(true);
    expect(checkNumber('0.33', 1 / 3)).toBe(false);
  });
});

describe('checkExpression', () => {
  it('detects algebraic equivalence', () => {
    expect(checkExpression('2(x+1)', '2x+2')).toBe(true);
    expect(checkExpression('(x+3)^2', 'x^2+6x+9')).toBe(true);
    expect(checkExpression('(x-y)(x+y)', 'x^2-y^2', ['x', 'y'])).toBe(true);
    expect(checkExpression('√(x^2)·0+x', 'x')).toBe(true);
  });
  it('rejects non-equivalent or malformed input', () => {
    expect(checkExpression('(x+3)^2', 'x^2+9')).toBe(false);
    expect(checkExpression('2x+', '2x')).toBe(false);
    expect(checkExpression('z', 'x')).toBe(false);
  });
});
