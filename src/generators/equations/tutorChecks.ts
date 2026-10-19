import { expect } from 'vitest';
import type { Question, StepProblem } from '../../engine/types';
import type { SolutionPath } from '../../tutor/types';
import { findLeak, type FinalValues } from '../../tutor/leak';
import { numbersEqual } from '../../engine/check';
import { evalLatex } from '../../engine/latex';

/** Every piece of help text a student could see on these paths. */
export function allHelpTexts(paths: SolutionPath[]): string[] {
  return paths.flatMap((p) => p.steps.flatMap((s) => [...s.hints, s.blank.latex, ...s.subSteps, ...Object.values(s.fixes ?? {})]));
}

function expectNoLeak(texts: string[], values: FinalValues) {
  for (const t of texts) {
    const leak = findLeak(t, values);
    if (leak) throw new Error(`Help reveals the answer ${JSON.stringify(values)}: "${t}"`);
  }
}

function expectBlanksWellFormed(paths: SolutionPath[]) {
  for (const s of paths.flatMap((p) => p.steps)) {
    expect(s.blank.latex).toContain('\\square');
    expect(Number.isFinite(s.blank.answer)).toBe(true);
    // The box hides a value: the side that holds it must not be computable.
    const boxed = s.blank.latex.split(/=|\\neq|\\to/).find((part) => part.includes('\\square'))!;
    expect(evalLatex(boxed)).toBeNull();
  }
}

/** Skills, distractors and solution paths for a regular question (spec B.3–B.4). */
export function expectTutorData(q: Question) {
  expect(q.skills.length).toBeGreaterThanOrEqual(1);
  expect(q.skills.length).toBeLessThanOrEqual(5);
  expect(q.solutionPaths.length).toBeGreaterThanOrEqual(1);
  for (const p of q.solutionPaths) {
    expect(p.steps.length).toBeGreaterThanOrEqual(1);
    for (const s of p.steps) {
      expect(q.skills).toContain(s.skill);
      expect(s.hints).toHaveLength(3);
      for (const h of s.hints) expect(h.length).toBeGreaterThan(5);
    }
  }
  expect(q.distractors.length).toBeGreaterThanOrEqual(1);
  for (const d of q.distractors) {
    if (q.answer.kind === 'number') expect(numbersEqual(d.value as number, q.answer.value)).toBe(false);
    if (q.answer.kind === 'choice') {
      expect(d.value).not.toBe(q.answer.options[q.answer.correctIndex]);
      expect(q.answer.options).toContain(d.value);
    }
  }
  expectBlanksWellFormed(q.solutionPaths);
  expectNoLeak(allHelpTexts(q.solutionPaths), q.finalValues);
}

export function expectStepHelp(p: StepProblem) {
  expect(p.skills.length).toBeGreaterThanOrEqual(1);
  const paths = p.steps.map((s, i) => ({ id: String(i), title: '', steps: [s.help] }));
  expectBlanksWellFormed(paths);
  expectNoLeak(allHelpTexts(paths), p.finalValues);
  for (const s of p.steps) {
    expect(s.optionCodes).toHaveLength(s.options.length);
    expect(s.optionCodes[s.correctIndex]).toBeNull();
  }
}
