import type { Difficulty, GeneratorDef, Question } from '../../engine/types';
import { type Rng, randInt, randNonZero, randSigned } from '../../engine/rng';
import { type Q, div, qLatex, toNumber } from '../../engine/rational';
import { linExpr, scaled, m } from '../../engine/format';

/** An equation reduced to A·x + B = C·x + D, plus how to present it. */
interface LinearForm {
  latex: string;
  expandedLatex?: string;
  A: number;
  B: number;
  C: number;
  D: number;
}

function build(d: Difficulty, rng: Rng): LinearForm {
  const x = randInt(rng, -10, 10);
  switch (d) {
    case 1: {
      if (rng() < 0.5) {
        const b = randNonZero(rng, -15, 15);
        return { latex: `${linExpr([[1, 'x'], [b, '']])} = ${x + b}`, A: 1, B: b, C: 0, D: x + b };
      }
      const a = randNonZero(rng, -9, 9, [1, -1]);
      return { latex: `${linExpr([[a, 'x']])} = ${a * x}`, A: a, B: 0, C: 0, D: a * x };
    }
    case 2: {
      const a = randNonZero(rng, -9, 9, [1, -1]);
      const b = randNonZero(rng, -20, 20);
      return { latex: `${linExpr([[a, 'x'], [b, '']])} = ${a * x + b}`, A: a, B: b, C: 0, D: a * x + b };
    }
    case 3: {
      const a = randNonZero(rng, -9, 9);
      const c = randNonZero(rng, -9, 9, [a]);
      const b = randNonZero(rng, -15, 15);
      const dd = a * x + b - c * x;
      return {
        latex: `${linExpr([[a, 'x'], [b, '']])} = ${linExpr([[c, 'x'], [dd, '']])}`,
        A: a, B: b, C: c, D: dd,
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
        A: a, B: a * b, C: c, D: dd,
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
          A, B, C: f, D: g,
        };
      }
    }
  }
}

export function solveLinear(form: Pick<LinearForm, 'A' | 'B' | 'C' | 'D'>): Q {
  return div(form.D - form.B, form.A - form.C);
}

export function linearQuestion(d: Difficulty, rng: Rng): Question {
  const form = build(d, rng);
  const k = form.A - form.C;
  const r = form.D - form.B;
  const sol = solveLinear(form);
  const isolated = `${linExpr([[k, 'x']])} = ${r}`;

  const solution: string[] = [m(form.latex)];
  if (form.expandedLatex) solution.push(`פותחים סוגריים: ${m(form.expandedLatex)}`);
  if (form.C !== 0 || form.B !== 0) {
    solution.push(`מעבירים את האיברים עם ${m('x')} לשמאל ואת המספרים לימין: ${m(isolated)}`);
  }
  if (k !== 1) solution.push(`מחלקים ב-${m(String(k))}: ${m(`x = ${qLatex(sol)}`)}`);
  else if (solution.length === 1) solution.push(m(`x = ${qLatex(sol)}`));

  return {
    kind: 'question',
    generatorId: 'eq.linear',
    topic: 'equations',
    difficulty: d,
    prompt: `פתרי את המשוואה ומצאי את ${m('x')}`,
    latex: form.latex,
    answer: { kind: 'number', value: toNumber(sol), display: `x = ${qLatex(sol)}` },
    hints: [
      form.expandedLatex
        ? 'קודם כול פתחי את הסוגריים — כפלי את המספר שמחוץ לסוגריים בכל איבר בפנים.'
        : `המטרה: לבודד את ${m('x')}. מה שעושים לאגף אחד — עושים גם לשני.`,
      `אחרי שמכנסים את ה-${m('x')}-ים לצד אחד והמספרים לצד השני מקבלים: ${m(isolated)}`,
      k === 1 ? `כמעט שם: ${m(isolated)}` : `נשאר לחלק את שני האגפים ב-${m(String(k))}.`,
    ],
    solution,
  };
}

/** Exported for the step-by-step generator and tests. */
export const linearInternals = { build };

export const linearGenerator: GeneratorDef<Question> = {
  id: 'eq.linear',
  topic: 'equations',
  title: 'משוואות ממעלה ראשונה',
  minDifficulty: 1,
  maxDifficulty: 5,
  generate: linearQuestion,
};
