import type { Difficulty, GeneratorDef, Question } from '../../engine/types';
import { type Rng, pick, randInt, randNonZero, randSigned } from '../../engine/rng';
import { type Q, div, qLatex, add, toNumber } from '../../engine/rational';
import { linExpr, scaled, m } from '../../engine/format';
import { makeCodedChoices } from '../../engine/choices';
import type { HelpStep } from '../../tutor/types';
import { collectStep, distributeStep, inequalityDivideStep } from '../../tutor/equationSteps';

export type Op = '<' | '>' | '\\le' | '\\ge';
export const flip: Record<Op, Op> = { '<': '>', '>': '<', '\\le': '\\ge', '\\ge': '\\le' };
const strictToggle: Record<Op, Op> = { '<': '\\le', '>': '\\ge', '\\le': '<', '\\ge': '>' };

/** Inequality reduced to A·x + B (op) C·x + D. */
interface Form {
  latex: string;
  expanded?: string;
  products?: Array<[number, number]>;
  A: number;
  B: number;
  C: number;
  D: number;
  op: Op;
}

function build(d: Difficulty, rng: Rng): Form {
  const op = pick<Op>(rng, ['<', '>', '\\le', '\\ge']);
  const x0 = randInt(rng, -8, 8);
  switch (d) {
    case 1: {
      const b = randNonZero(rng, -12, 12);
      return { latex: `${linExpr([[1, 'x'], [b, '']])} ${op} ${x0 + b}`, A: 1, B: b, C: 0, D: x0 + b, op };
    }
    case 2: {
      const a = randInt(rng, 2, 9);
      const b = randNonZero(rng, -15, 15);
      return { latex: `${linExpr([[a, 'x'], [b, '']])} ${op} ${a * x0 + b}`, A: a, B: b, C: 0, D: a * x0 + b, op };
    }
    case 3: {
      const a = -randInt(rng, 2, 9);
      const b = randNonZero(rng, -15, 15);
      return { latex: `${linExpr([[a, 'x'], [b, '']])} ${op} ${a * x0 + b}`, A: a, B: b, C: 0, D: a * x0 + b, op };
    }
    case 4: {
      const a = randNonZero(rng, -9, 9);
      const c = randNonZero(rng, -9, 9, [a]);
      const b = randNonZero(rng, -15, 15);
      const dd = randInt(rng, -20, 20);
      return {
        latex: `${linExpr([[a, 'x'], [b, '']])} ${op} ${linExpr([[c, 'x'], [dd, '']])}`,
        A: a, B: b, C: c, D: dd, op,
      };
    }
    default: {
      const a = randSigned(rng, 2, 6);
      const b = randNonZero(rng, -6, 6);
      const c = randNonZero(rng, -8, 8, [a]);
      const dd = randInt(rng, -15, 15);
      return {
        latex: `${scaled(a, linExpr([[1, 'x'], [b, '']]))} ${op} ${linExpr([[c, 'x'], [dd, '']])}`,
        expanded: `${linExpr([[a, 'x'], [a * b, '']])} ${op} ${linExpr([[c, 'x'], [dd, '']])}`,
        products: [[a, b]],
        A: a, B: a * b, C: c, D: dd, op,
      };
    }
  }
}

export interface InequalitySolution {
  op: Op;
  bound: Q;
}

export function solveInequality(f: Pick<Form, 'A' | 'B' | 'C' | 'D' | 'op'>): InequalitySolution {
  const k = f.A - f.C;
  return { op: k < 0 ? flip[f.op] : f.op, bound: div(f.D - f.B, k) };
}

const show = (op: Op, bound: Q) => m(`x ${op} ${qLatex(bound)}`);

export function inequalityQuestion(d: Difficulty, rng: Rng): Question {
  const f = build(d, rng);
  const k = f.A - f.C;
  const r = f.D - f.B;
  const { op, bound } = solveInequality(f);
  const isolated = `${linExpr([[k, 'x']])} ${f.op} ${r}`;
  const wrongBound = div(f.D + f.B, k);

  const { options, correctIndex, optionCodes } = makeCodedChoices(
    rng,
    show(op, bound),
    [
      { code: k < 0 ? 'no-flip' : 'flip-unneeded', value: show(flip[op], bound) },
      { code: 'sign-move', value: show(op, wrongBound) },
      { code: 'strictness', value: show(strictToggle[op], bound) },
      { code: 'sign-move', value: show(flip[op], wrongBound) },
    ],
    () => show(pick(rng, ['<', '>', '\\le', '\\ge'] as Op[]), add(bound, randNonZero(rng, -3, 3))),
  );

  const steps: HelpStep[] = [];
  const avoid = [toNumber(bound)];
  if (f.products) steps.push(distributeStep(rng, f.products));
  if (f.B !== 0 || f.C !== 0) steps.push(collectStep(rng, f, avoid, f.op));
  if (k !== 1) steps.push(inequalityDivideStep(rng, k, r, f.op, avoid));

  const solution = [m(f.latex)];
  if (f.expanded) solution.push(`פותחים סוגריים: ${m(f.expanded)}`);
  solution.push(`מכנסים: ${m(isolated)}`);
  if (k < 0) solution.push(`מחלקים במספר שלילי ${m(String(k))} — ולכן הופכים את כיוון אי-השוויון!`);
  else if (k !== 1) solution.push(`מחלקים ב-${m(String(k))} (חיובי — הכיוון נשאר).`);
  solution.push(show(op, bound));

  return {
    kind: 'question',
    generatorId: 'eq.inequality',
    topic: 'equations',
    difficulty: d,
    prompt: 'מהו פתרון אי-השוויון?',
    latex: f.latex,
    answer: { kind: 'choice', options, correctIndex },
    solution,
    skills: [...new Set(steps.map((st) => st.skill))],
    distractors: options.flatMap((o, i) => (optionCodes[i] ? [{ code: optionCodes[i]!, value: o }] : [])),
    solutionPaths: [{ id: 'isolate', title: 'בידוד x', steps }],
    finalValues: { x: toNumber(bound) },
  };
}

export const inequalityGenerator: GeneratorDef<Question> = {
  id: 'eq.inequality',
  topic: 'equations',
  title: 'אי-שוויונות',
  minDifficulty: 1,
  maxDifficulty: 5,
  generate: inequalityQuestion,
};
