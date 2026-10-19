import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../engine/rng';
import type { Difficulty, Question, StepProblem } from '../../engine/types';
import { linearQuestion, fractionQuestion, inequalityQuestion, systemQuestion, linearSteps, fractionSteps, systemSteps } from '.';
import { allHelpTexts, expectTutorData, expectStepHelp } from './tutorChecks';
import { equationHolds, inequalityHolds, parseCases, splitInequality, unwrap, evalAt } from '../testUtils';

const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5];
const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);

function forAll(fn: (d: Difficulty, seed: number) => void) {
  for (const d of DIFFICULTIES) for (const seed of SEEDS) fn(d, seed);
}

/** Every integer appearing in the problem should stay readable. */
function expectSmallNumbers(latex: string, max = 200) {
  for (const n of latex.match(/\d+/g) ?? []) expect(Number(n)).toBeLessThanOrEqual(max);
}

function expectWellFormed(q: Question) {
  expect(q.solution.length).toBeGreaterThan(1);
  expectTutorData(q);
  if (q.answer.kind === 'choice') {
    expect(q.answer.options).toHaveLength(4);
    expect(new Set(q.answer.options).size).toBe(4);
    expect(q.answer.correctIndex).toBeGreaterThanOrEqual(0);
  }
}

describe('eq.linear', () => {
  it('answers satisfy the equation, integers up to difficulty 4', () => {
    forAll((d, seed) => {
      const q = linearQuestion(d, mulberry32(seed));
      expectWellFormed(q);
      if (q.answer.kind !== 'number') throw new Error('expected number');
      expect(equationHolds(q.latex!, { x: q.answer.value })).toBe(true);
      if (d <= 4) expect(Number.isInteger(q.answer.value)).toBe(true);
      expectSmallNumbers(q.latex!);
    });
  });
});

describe('eq.fractions', () => {
  it('answers satisfy the equation and are integers', () => {
    forAll((d, seed) => {
      const q = fractionQuestion(d, mulberry32(seed));
      expectWellFormed(q);
      if (q.answer.kind !== 'number') throw new Error('expected number');
      expect(Number.isInteger(q.answer.value)).toBe(true);
      expect(equationHolds(q.latex!, { x: q.answer.value })).toBe(true);
      expectSmallNumbers(q.latex!);
    });
  });
});

describe('eq.inequality', () => {
  it('the correct option describes exactly the solution set', () => {
    forAll((d, seed) => {
      const q = inequalityQuestion(d, mulberry32(seed));
      expectWellFormed(q);
      if (q.answer.kind !== 'choice') throw new Error('expected choice');
      const correct = unwrap(q.answer.options[q.answer.correctIndex]);
      const { rhs } = splitInequality(correct);
      const bound = evalAt(rhs, {});
      for (const x of [bound - 3, bound - 0.5, bound, bound + 0.5, bound + 3]) {
        expect(inequalityHolds(q.latex!, x)).toBe(inequalityHolds(correct, x));
      }
      // No other option may be equivalent to the correct one.
      q.answer.options.forEach((opt, i) => {
        if (i === (q.answer as { correctIndex: number }).correctIndex) return;
        const o = unwrap(opt);
        const same = [bound - 3, bound, bound + 3, evalAt(splitInequality(o).rhs, {})].every(
          (x) => inequalityHolds(o, x) === inequalityHolds(correct, x),
        );
        expect(same).toBe(false);
      });
    });
  });
});

describe('eq.system', () => {
  it('the correct pair satisfies both equations, distractors do not', () => {
    forAll((d, seed) => {
      const q = systemQuestion(d, mulberry32(seed));
      expectWellFormed(q);
      if (q.answer.kind !== 'choice') throw new Error('expected choice');
      const eqs = parseCases(q.latex!);
      q.answer.options.forEach((opt, i) => {
        const [x, y] = unwrap(opt).match(/-?\d+/g)!.map(Number);
        const ok = eqs.every((e) => equationHolds(e, { x, y }));
        expect(ok).toBe(i === (q.answer as { correctIndex: number }).correctIndex);
      });
    });
  });
});

function expectStepsWellFormed(p: StepProblem) {
  expectStepHelp(p);
  for (const s of p.steps) {
    expect(s.options).toHaveLength(4);
    expect(new Set(s.options).size).toBe(4);
    expect(s.options[s.correctIndex]).toBeDefined();
  }
}

const finalX = (p: StepProblem) => evalAt(unwrap(p.finalAnswer).split('=')[1], {});

describe('step problems', () => {
  it('steps.linear final answer solves the equation', () => {
    forAll((d, seed) => {
      const p = linearSteps(d, mulberry32(seed));
      expectStepsWellFormed(p);
      expect(equationHolds(p.latex, { x: finalX(p) })).toBe(true);
      // The correct option of each step is still an equivalent equation.
      for (const s of p.steps) expect(equationHolds(unwrap(s.options[s.correctIndex]), { x: finalX(p) })).toBe(true);
    });
  });

  it('steps.fractions final answer solves the equation', () => {
    forAll((d, seed) => {
      const p = fractionSteps(d, mulberry32(seed));
      expectStepsWellFormed(p);
      const x = finalX(p);
      expect(Number.isInteger(x)).toBe(true);
      expect(equationHolds(p.latex, { x })).toBe(true);
      for (const s of p.steps.slice(1)) expect(equationHolds(unwrap(s.options[s.correctIndex]), { x })).toBe(true);
    });
  });

  it('steps.system final pair solves the system', () => {
    forAll((d, seed) => {
      const p = systemSteps(d, mulberry32(seed));
      expectStepsWellFormed(p);
      const [x, y] = unwrap(p.finalAnswer).match(/-?\d+/g)!.map(Number);
      for (const e of parseCases(p.latex)) expect(equationHolds(e, { x, y })).toBe(true);
    });
  });
});

describe('determinism', () => {
  it('the same seed gives the same question', () => {
    const gens = [linearQuestion, fractionQuestion, inequalityQuestion, systemQuestion, linearSteps, fractionSteps, systemSteps];
    for (const g of gens) for (const d of DIFFICULTIES) {
      expect(JSON.stringify(g(d, mulberry32(42)))).toBe(JSON.stringify(g(d, mulberry32(42))));
    }
  });
});

describe('help texts', () => {
  it('cover every rung of every step', () => {
    const q = linearQuestion(4, mulberry32(7));
    // distribute + collect + divide, each with 3 hints, a blank and sub-steps
    expect(q.solutionPaths[0].steps.map((s) => s.skill)).toEqual(['distribute', 'move-term-sign', 'divide-coefficient']);
    expect(allHelpTexts(q.solutionPaths).length).toBeGreaterThan(12);
  });
});
