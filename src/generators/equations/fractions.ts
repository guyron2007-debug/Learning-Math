import type { Difficulty, GeneratorDef, Question } from '../../engine/types';
import { type Rng, randInt, randNonZero } from '../../engine/rng';
import { div, lcm } from '../../engine/rational';
import { linExpr, m } from '../../engine/format';
import type { HelpStep } from '../../tutor/types';
import { numericDistractors } from '../../tutor/distractors';
import { clearDenominatorStep, commonDenominatorStep, crossMultiplyStep, domainStep } from '../../tutor/equationSteps';
import { linearHelpSteps, linearSkills } from './linear';

const frac = (top: string, bottom: string | number) => `\\frac{${top}}{${bottom}}`;
const xPlus = (a: number) => linExpr([[1, 'x'], [a, '']]);

function distinctDenominators(rng: Rng): [number, number] {
  const a = randInt(rng, 2, 6);
  const b = randNonZero(rng, 2, 6, [a]);
  return [a, b];
}

export function fractionQuestion(d: Difficulty, rng: Rng): Question {
  const base = {
    kind: 'question' as const,
    generatorId: 'eq.fractions',
    topic: 'equations' as const,
    difficulty: d,
    prompt: `פתרי את המשוואה ומצאי את ${m('x')}`,
  };
  const finish = (x: number, steps: HelpStep[]) => ({
    answer: { kind: 'number' as const, value: x, display: `x = ${x}` },
    skills: linearSkills(steps),
    solutionPaths: [{ id: 'clear', title: 'היפטרות מהמכנים', steps }],
    finalValues: { x },
  });

  if (d <= 2) {
    // (x + a)/m = c  or  (k·x + a)/m = c
    const den = randInt(rng, 2, 9);
    const x = randNonZero(rng, -10, 12);
    const k = d === 1 ? 1 : randNonZero(rng, -5, 5, [1, -1]);
    const c = randInt(rng, -6, 8);
    const a = c * den - k * x;
    const top = linExpr([[k, 'x'], [a, '']]);
    const latex = `${frac(top, den)} = ${c}`;
    const cleared = `${top} = ${c * den}`;
    const steps = [clearDenominatorStep(rng, [den], den, c), ...linearHelpSteps(rng, { A: k, B: a, C: 0, D: c * den }, x)];
    return {
      ...base,
      latex,
      solution: [m(latex), `כופלים ב-${m(String(den))}: ${m(cleared)}`, m(`${linExpr([[k, 'x']])} = ${c * den - a}`), m(`x = ${x}`)],
      distractors: numericDistractors(x, [
        ['clear-rhs', () => div(c - a, k)],
        ['sign-move', a !== 0 ? () => div(c * den + a, k) : null],
        ['divide-wrong', k !== 1 ? () => (c * den - a) * k : null],
        ['partial', k !== 1 ? () => c * den - a : null],
        ['clear-divide', () => div(c - a * den, k * den)],
      ]),
      ...finish(x, steps),
    };
  }

  if (d <= 4) {
    // d3: x/p + x/r = c     d4: (x + a)/p + (x + b)/r = c
    const [p, r] = distinctDenominators(rng);
    const L = lcm(p, r);
    let x: number, a: number, b: number, c: number;
    if (d === 3) {
      x = L * randNonZero(rng, -4, 5);
      a = 0;
      b = 0;
      c = x / p + x / r;
    } else {
      x = randNonZero(rng, -6, 10);
      const k1 = randInt(rng, -3, 4);
      const k2 = randInt(rng, -3, 4);
      a = p * k1 - x;
      b = r * k2 - x;
      c = k1 + k2;
    }
    const latex = `${frac(xPlus(a), p)} + ${frac(xPlus(b), r)} = ${c}`;
    const s1 = L / p, s2 = L / r;
    const times = (s: number, shift: number) =>
      shift === 0 ? linExpr([[s, 'x']]) : `${s === 1 ? '' : s}(${xPlus(shift)})`;
    const cleared = `${times(s1, a)} + ${times(s2, b)} = ${c * L}`;
    const expanded = linExpr([[s1 + s2, 'x'], [s1 * a + s2 * b, '']]);
    const products = ([[s1, a], [s2, b]] as Array<[number, number]>).filter(([s, shift]) => shift !== 0 && s !== 1);
    const steps = [
      commonDenominatorStep(p, r, L),
      clearDenominatorStep(rng, [p, r], L, c),
      ...linearHelpSteps(rng, { A: s1 + s2, B: s1 * a + s2 * b, C: 0, D: c * L, products }, x),
    ];
    const K = s1 + s2;
    return {
      ...base,
      latex,
      solution: [
        m(latex),
        `כופלים את שני האגפים ב-${m(String(L))}: ${m(cleared)}`,
        `פותחים סוגריים ומכנסים: ${m(`${expanded} = ${c * L}`)}`,
        m(`${linExpr([[K, 'x']])} = ${c * L - s1 * a - s2 * b}`),
        m(`x = ${x}`),
      ],
      distractors: numericDistractors(x, [
        ['clear-rhs', () => div(c - s1 * a - s2 * b, K)],
        ['clear-numerator', a !== 0 || b !== 0 ? () => div(c * L - a - b, K) : null],
        ['sign-move', () => div(c * L + s1 * a + s2 * b, K)],
        ['clear-swap', () => div(c * L - s2 * a - s1 * b, K)],
      ]),
      ...finish(x, steps),
    };
  }

  // d5: variable in the denominator — k·u/(x + b) = k·v/(x + e), with x + b = u, x + e = v.
  for (;;) {
    const x = randNonZero(rng, -8, 10);
    const u = randNonZero(rng, -6, 8);
    const v = randNonZero(rng, -6, 8, [u]);
    const k = randInt(rng, 1, 3);
    const b = u - x, e = v - x;
    if (b === 0 || e === 0) continue;
    const A = k * u, C = k * v;
    const latex = `${frac(String(A), xPlus(b))} = ${frac(String(C), xPlus(e))}`;
    const cross = `${A}(${xPlus(e)}) = ${C}(${xPlus(b)})`;
    const expanded = `${linExpr([[A, 'x'], [A * e, '']])} = ${linExpr([[C, 'x'], [C * b, '']])}`;
    const steps = [
      domainStep(rng, [-b, -e], [x]),
      crossMultiplyStep(rng, A, C, b, e),
      ...linearHelpSteps(rng, { A, B: A * e, C, D: C * b, products: [[A, e], [C, b]] }, x),
    ];
    return {
      ...base,
      latex,
      solution: [
        m(latex),
        `תחום הצבה: ${m(`x \\neq ${-b},\; x \\neq ${-e}`)}`,
        `כפל בהצלבה: ${m(cross)}`,
        m(expanded),
        m(`${linExpr([[A - C, 'x']])} = ${C * b - A * e}`),
        `${m(`x = ${x}`)} — והוא בתחום ההצבה ✓`,
      ],
      distractors: numericDistractors(x, [
        ['distribute-partial', () => div(b - e, A - C)],
        ['sign-move', () => div(C * b + A * e, A - C)],
        ['cross-wrong', () => div(C * e - A * b, A - C)],
        ['domain', () => -b],
      ]),
      ...finish(x, steps),
    };
  }
}

export const fractionGenerator: GeneratorDef<Question> = {
  id: 'eq.fractions',
  topic: 'equations',
  title: 'משוואות עם שברים',
  minDifficulty: 1,
  maxDifficulty: 5,
  generate: fractionQuestion,
};
