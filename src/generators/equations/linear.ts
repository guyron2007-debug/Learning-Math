import type { Difficulty, GeneratorDef, Question } from '../../engine/types';
import { type Rng, randInt, randNonZero, randSigned } from '../../engine/rng';
import { type Q, div, mul, qLatex, toNumber } from '../../engine/rational';
import { linExpr, scaled, m } from '../../engine/format';
import type { HelpStep, SkillId } from '../../tutor/types';
import { numericDistractors } from '../../tutor/distractors';
import { collectStep, distributeStep, divideStep } from '../../tutor/equationSteps';

/** An equation reduced to A·x + B = C·x + D, plus how to present it. */
interface LinearForm {
  latex: string;
  expandedLatex?: string;
  /** Products a(x + b) that need distributing, as [a, b]. */
  products: Array<[number, number]>;
  A: number;
  B: number;
  C: number;
  D: number;
}

function build(d: Difficulty, rng: Rng): LinearForm {
  // x ≠ 0: with a zero answer most misconceptions give the same value and can't be told apart.
  const x = randNonZero(rng, -10, 10);
  switch (d) {
    case 1: {
      if (rng() < 0.5) {
        const b = randNonZero(rng, -15, 15);
        return { latex: `${linExpr([[1, 'x'], [b, '']])} = ${x + b}`, products: [], A: 1, B: b, C: 0, D: x + b };
      }
      const a = randNonZero(rng, -9, 9, [1, -1]);
      return { latex: `${linExpr([[a, 'x']])} = ${a * x}`, products: [], A: a, B: 0, C: 0, D: a * x };
    }
    case 2: {
      const a = randNonZero(rng, -9, 9, [1, -1]);
      const b = randNonZero(rng, -20, 20);
      return { latex: `${linExpr([[a, 'x'], [b, '']])} = ${a * x + b}`, products: [], A: a, B: b, C: 0, D: a * x + b };
    }
    case 3: {
      const a = randNonZero(rng, -9, 9);
      const c = randNonZero(rng, -9, 9, [a]);
      const b = randNonZero(rng, -15, 15);
      const dd = a * x + b - c * x;
      return {
        latex: `${linExpr([[a, 'x'], [b, '']])} = ${linExpr([[c, 'x'], [dd, '']])}`,
        products: [], A: a, B: b, C: c, D: dd,
      };
    }
    case 4: {
      const a = randSigned(rng, 2, 7);
      const b = randNonZero(rng, -9, 9);
      const c = randNonZero(rng, -9, 9, [a]);
      const dd = a * (x + b) - c * x;
      return {
        latex: `${scaled(a, linExpr([[1, 'x'], [b, '']]))} = ${linExpr([[c, 'x'], [dd, '']])}`,
        expandedLatex: `${linExpr([[a, 'x'], [a * b, '']])} = ${linExpr([[c, 'x'], [dd, '']])}`,
        products: [[a, b]], A: a, B: a * b, C: c, D: dd,
      };
    }
    default: {
      // a(x + b) - c(x + e) = f·x + g, answer may be a fraction.
      for (;;) {
        const a = randInt(rng, 2, 8);
        const c = randInt(rng, 2, 8);
        const b = randNonZero(rng, -9, 9);
        const e = randNonZero(rng, -9, 9);
        const f = randNonZero(rng, -6, 6);
        const g = randNonZero(rng, -20, 20);
        const A = a - c;
        if (A === f) continue;
        const B = a * b - c * e;
        const sol = div(g - B, A - f);
        if (sol.d > 6 || Math.abs(toNumber(sol)) > 15) continue;
        return {
          latex: `${scaled(a, linExpr([[1, 'x'], [b, '']]))} - ${scaled(c, linExpr([[1, 'x'], [e, '']]))} = ${linExpr([[f, 'x'], [g, '']])}`,
          expandedLatex: `${linExpr([[a, 'x'], [a * b, ''], [-c, 'x'], [-c * e, '']])} = ${linExpr([[f, 'x'], [g, '']])}`,
          products: [[a, b], [-c, e]], A, B, C: f, D: g,
        };
      }
    }
  }
}

export function solveLinear(form: Pick<LinearForm, 'A' | 'B' | 'C' | 'D'>): Q {
  return div(form.D - form.B, form.A - form.C);
}

/** Help steps for A·x + B = C·x + D (after any distributing). Shared with other generators. */
export function linearHelpSteps(rng: Rng, f: Pick<LinearForm, 'A' | 'B' | 'C' | 'D'> & { products?: Array<[number, number]> }, answer: number): HelpStep[] {
  const steps: HelpStep[] = [];
  const k = f.A - f.C;
  const r = f.D - f.B;
  if (f.products?.length) steps.push(distributeStep(rng, f.products));
  if (f.B !== 0 || f.C !== 0) steps.push(collectStep(rng, f, [answer]));
  if (k !== 1) steps.push(divideStep(rng, k, r, [answer]));
  return steps;
}

export function linearSkills(steps: HelpStep[]): SkillId[] {
  return [...new Set(steps.map((s) => s.skill))];
}

export function linearQuestion(d: Difficulty, rng: Rng): Question {
  const form = build(d, rng);
  const k = form.A - form.C;
  const r = form.D - form.B;
  const sol = solveLinear(form);
  const answer = toNumber(sol);
  const isolated = `${linExpr([[k, 'x']])} = ${r}`;

  const solution: string[] = [m(form.latex)];
  if (form.expandedLatex) solution.push(`פותחים סוגריים: ${m(form.expandedLatex)}`);
  if (form.C !== 0 || form.B !== 0) {
    solution.push(`מעבירים את האיברים עם ${m('x')} לשמאל ואת המספרים לימין: ${m(isolated)}`);
  }
  if (k !== 1) solution.push(`מחלקים ב-${m(String(k))}: ${m(`x = ${qLatex(sol)}`)}`);
  else if (solution.length === 1) solution.push(m(`x = ${qLatex(sol)}`));

  const steps = linearHelpSteps(rng, form, answer);
  // Distributing only the "x" (a(x+b) → ax + b) changes B from Σa·b to Σb.
  const partialB = form.products.length ? form.B - form.products.reduce((s, [a, b]) => s + a * b - b, 0) : null;

  return {
    kind: 'question',
    generatorId: 'eq.linear',
    topic: 'equations',
    difficulty: d,
    prompt: `פתרי את המשוואה ומצאי את ${m('x')}`,
    latex: form.latex,
    answer: { kind: 'number', value: answer, display: `x = ${qLatex(sol)}` },
    solution,
    skills: linearSkills(steps),
    distractors: numericDistractors(answer, [
      ['sign-move', form.B !== 0 ? () => div(form.D + form.B, k) : null],
      ['coef-sign', form.C !== 0 && form.A + form.C !== 0 ? () => div(r, form.A + form.C) : null],
      ['divide-wrong', k !== 1 ? () => mul(r, k) : null],
      ['partial', k !== 1 ? () => r : null],
      ['distribute-partial', partialB !== null ? () => div(form.D - partialB, k) : null],
      ['divide-sign', () => div(-r, k)],
    ]),
    solutionPaths: [{ id: 'isolate', title: 'בידוד x', steps }],
    finalValues: { x: answer },
  };
}

export const linearInternals = { build };

export const linearGenerator: GeneratorDef<Question> = {
  id: 'eq.linear',
  topic: 'equations',
  title: 'משוואות ממעלה ראשונה',
  minDifficulty: 1,
  maxDifficulty: 5,
  generate: linearQuestion,
};
