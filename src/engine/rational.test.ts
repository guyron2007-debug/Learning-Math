import { describe, expect, it } from 'vitest';
import { q, add, sub, mul, div, qLatex, qText, lcm, gcd } from './rational';
import { linExpr, scaled } from './format';

describe('rational', () => {
  it('normalizes sign and reduces', () => {
    expect(q(4, -6)).toEqual({ n: -2, d: 3 });
    expect(q(0, -5)).toEqual({ n: 0, d: 1 });
  });
  it('does arithmetic', () => {
    expect(add(q(1, 2), q(1, 3))).toEqual(q(5, 6));
    expect(sub(1, q(1, 4))).toEqual(q(3, 4));
    expect(mul(q(2, 3), q(3, 4))).toEqual(q(1, 2));
    expect(div(3, -6)).toEqual(q(-1, 2));
  });
  it('formats', () => {
    expect(qLatex(q(-3, 4))).toBe('-\\frac{3}{4}');
    expect(qLatex(q(8, 4))).toBe('2');
    expect(qText(q(-3, 4))).toBe('-3/4');
  });
  it('gcd/lcm', () => {
    expect(gcd(12, -18)).toBe(6);
    expect(lcm(4, 6)).toBe(12);
  });
});

describe('linExpr', () => {
  it('handles signs, unit coefficients and zeros', () => {
    expect(linExpr([[3, 'x'], [-5, '']])).toBe('3x - 5');
    expect(linExpr([[-1, 'x'], [4, '']])).toBe('-x + 4');
    expect(linExpr([[1, 'x'], [0, '']])).toBe('x');
    expect(linExpr([[0, 'x'], [0, '']])).toBe('0');
    expect(linExpr([[q(-2, 3), 'x']])).toBe('-\\frac{2}{3}x');
  });
  it('scaled', () => {
    expect(scaled(3, 'x - 2')).toBe('3(x - 2)');
    expect(scaled(-1, 'x + 4')).toBe('-(x + 4)');
    expect(scaled(1, 'x + 4')).toBe('x + 4');
  });
});
