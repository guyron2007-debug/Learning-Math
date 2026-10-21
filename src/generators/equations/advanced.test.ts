import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../engine/rng';
import type { Difficulty, Question } from '../../engine/types';
import { shortMultQuestion, rationalQuestion, paramQuestion, wordQuestion } from '.';
import { expectTutorData } from './tutorChecks';
import { equationHolds as holds, evalAt as evalRaw, parseCases } from '../testUtils';

const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5];
const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);

function forAll(gen: (d: Difficulty, rng: () => number) => Question, fn: (q: Question, d: Difficulty) => void) {
  for (const d of DIFFICULTIES) for (const seed of SEEDS) {
    const q = gen(d, mulberry32(seed));
    expect(q.solution.length).toBeGreaterThan(1);
    expectTutorData(q);
    for (const n of (q.latex ?? '').match(/\d+/g) ?? []) expect(Number(n)).toBeLessThanOrEqual(200);
    fn(q, d);
  }
}

// "m(x + 3)" and "x(x + 2)" read as function calls to math.js; make the products explicit.
const explicit = (latex: string) => latex.replace(/([mx])\(/g, '$1*(').replace(/m x/g, 'm*x').replace(/m y/g, 'm*y');
const equationHolds = (latex: string, scope: Record<string, number>) => holds(explicit(latex), scope);
const evalAt = (latex: string, scope: Record<string, number>) => evalRaw(explicit(latex), scope);

const value = (q: Question) => {
  if (q.answer.kind !== 'number') throw new Error('expected number');
  return q.answer.value;
};

/** lhs − rhs as a function of x (with m fixed). */
const gap = (latex: string, scope: Record<string, number>) => {
  const [lhs, rhs] = latex.split('=');
  return evalAt(lhs, scope) - evalAt(rhs, scope);
};

/** The denominators' roots that the answer must avoid: x ± p with x in a denominator. */
function denominatorsVanish(latex: string, x: number): boolean {
  return [...latex.matchAll(/\\frac\{[^{}]*\}\{([^{}]*)\}/g)].some((mm) => Math.abs(evalAt(mm[1], { x })) < 1e-9);
}

describe('eq.shortMult', () => {
  it('the answer solves the equation and x² really cancels', () => {
    forAll(shortMultQuestion, (q) => {
      const x = value(q);
      expect(x).not.toBe(0);
      expect(equationHolds(q.latex!, { x })).toBe(true);
      // Linear after cancelling: the gap is a straight line in x.
      const [g0, g1, g2] = [0, 1, 2].map((t) => gap(q.latex!, { x: t }));
      expect(Math.abs(g2 - 2 * g1 + g0)).toBeLessThan(1e-9);
    });
  });
});

describe('eq.rational', () => {
  it('the integer answer solves the equation and is inside the domain', () => {
    forAll(rationalQuestion, (q) => {
      const x = value(q);
      expect(Number.isInteger(x)).toBe(true);
      expect(denominatorsVanish(q.latex!, x)).toBe(false);
      expect(equationHolds(q.latex!, { x })).toBe(true);
    });
  });
});

describe('eq.param', () => {
  it('the parameter does what the question asks', () => {
    forAll(paramQuestion, (q, d) => {
      const mm = value(q);
      expect(Number.isInteger(mm)).toBe(true);
      expect(q.finalValues).toEqual({ m: mm });
      if (d <= 2) {
        const s = Number(q.prompt.match(/x = (-?\d+)/)![1]);
        expect(equationHolds(q.latex!, { x: s, m: mm })).toBe(true);
        expect(equationHolds(q.latex!, { x: s, m: mm + 1 })).toBe(false);
      } else if (d <= 4) {
        const gaps = [-2, 0, 3].map((x) => gap(q.latex!, { x, m: mm }));
        expect(Math.abs(gaps[0] - gaps[1]) + Math.abs(gaps[1] - gaps[2])).toBeLessThan(1e-9); // 0·x = const
        const none = d === 3 || q.prompt.includes('אף פתרון');
        if (none) expect(Math.abs(gaps[0])).toBeGreaterThan(1e-9);
        else expect(Math.abs(gaps[0])).toBeLessThan(1e-9);
      } else {
        // Parallel, distinct lines: coefficients proportional, constants not.
        const eqs = parseCases(q.latex!);
        const coef = (e: string) => {
          const at = (x: number, y: number) => gap(e, { x, y, m: mm });
          const c0 = at(0, 0);
          return [at(1, 0) - c0, at(0, 1) - c0, -c0];
        };
        const [a1, b1, c1] = coef(eqs[0]);
        const [a2, b2, c2] = coef(eqs[1]);
        expect(Math.abs(a1 * b2 - a2 * b1)).toBeLessThan(1e-9);
        expect(Math.abs(a1 * c2 - a2 * c1)).toBeGreaterThan(1e-9);
      }
    });
  });
});

describe('eq.word', () => {
  it('the worked equation holds for the answer, which is a positive integer', () => {
    forAll(wordQuestion, (q) => {
      const x = value(q);
      expect(Number.isInteger(x)).toBe(true);
      expect(x).toBeGreaterThan(0);
      // Every equation in the worked solution (the model and the steps after it) holds for the answer.
      const equations = q.solution.flatMap((l) => l.split('$').filter((_, i) => i % 2 === 1)).filter((e) => e.includes('=') && e.includes('x'));
      expect(equations.length).toBeGreaterThanOrEqual(2);
      for (const e of equations) expect(equationHolds(e, { x })).toBe(true);
      expect(q.prompt).not.toContain('undefined');
    });
  });
});
