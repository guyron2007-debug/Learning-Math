import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../engine/rng';
import { linearQuestion, systemQuestion, inequalityQuestion } from '../generators/equations';
import type { Question } from '../engine/types';
import type { LearnerProfile, SkillId, SolutionPath } from './types';
import { answerBlank, choosePath, currentHelp, diagnose, getNextHelp, helpRungs, moreHelp, openingLevel, startSession, type TutorSession } from './engine';
import { defaultLearner } from './profile';

const NOW = new Date('2026-10-19T12:00:00Z');

function withMastery(entries: Partial<Record<SkillId, number>>): LearnerProfile {
  const p = defaultLearner();
  for (const [skill, mastery] of Object.entries(entries)) {
    p.skills[skill as SkillId] = { mastery: mastery!, attempts: 5, lastSeen: NOW.toISOString(), helpLevelNeeded: 0 };
  }
  return p;
}

/** A question of the form a(x+b) = cx + d, whose path is distribute → collect → divide. */
function bracketQuestion(): Question {
  return linearQuestion(4, mulberry32(7));
}

describe('diagnose', () => {
  it('recognizes each typed distractor', () => {
    for (let seed = 1; seed < 60; seed++) {
      const q = linearQuestion(3, mulberry32(seed));
      for (const d of q.distractors) expect(diagnose(q, String(d.value))).toBe(d.code);
      if (q.answer.kind === 'number') expect(diagnose(q, String(q.answer.value))).toBeNull();
    }
  });
  it('accepts an equivalent fraction', () => {
    const q = linearQuestion(2, mulberry32(3));
    const d = q.distractors[0];
    expect(diagnose(q, `${(d.value as number) * 2}/2`)).toBe(d.code);
  });
  it('recognizes a chosen option', () => {
    const q = inequalityQuestion(3, mulberry32(5));
    if (q.answer.kind !== 'choice') throw new Error();
    const opts = q.answer.options;
    const i = opts.findIndex((o) => q.distractors.some((d) => d.value === o));
    expect(diagnose(q, i)).toBe(q.distractors.find((d) => d.value === opts[i])!.code);
    expect(diagnose(q, q.answer.correctIndex)).toBeNull();
  });
});

describe('choosePath', () => {
  const sys = systemQuestion(2, mulberry32(11));
  const ids = (p: SolutionPath[]) => p.map((x) => x.id);
  it('offers both elimination and substitution when y has coefficient 1', () => {
    expect(ids(sys.solutionPaths)).toEqual(['elimination', 'substitution']);
  });
  it('picks the path whose skills she is strongest in', () => {
    const strongSub = withMastery({ 'two-eq-substitution': 0.9, 'two-eq-elimination': 0.2 });
    expect(choosePath(sys.solutionPaths, strongSub, NOW).id).toBe('substitution');
    const strongElim = withMastery({ 'two-eq-substitution': 0.2, 'two-eq-elimination': 0.9 });
    expect(choosePath(sys.solutionPaths, strongElim, NOW).id).toBe('elimination');
  });
  it('breaks ties by the shorter path', () => {
    const step = sys.solutionPaths[0].steps[0];
    const long: SolutionPath = { id: 'long', title: '', steps: [step, step, step] };
    const short: SolutionPath = { id: 'short', title: '', steps: [step] };
    expect(choosePath([long, short], defaultLearner(), NOW).id).toBe('short');
  });
});

describe('openingLevel', () => {
  it('follows the mastery bands', () => {
    expect(openingLevel(withMastery({ distribute: 0.8 }), 'distribute', NOW)).toBe(0);
    expect(openingLevel(withMastery({ distribute: 0.7 }), 'distribute', NOW)).toBe(0);
    expect(openingLevel(withMastery({ distribute: 0.5 }), 'distribute', NOW)).toBe(1);
    expect(openingLevel(withMastery({ distribute: 0.39 }), 'distribute', NOW)).toBe(2);
    expect(openingLevel(defaultLearner(), 'distribute', NOW)).toBe(1);
  });
  it('prefers examples in the middle band when they work better for her', () => {
    const p = withMastery({ distribute: 0.5 });
    p.helpTypes = { example: { given: 10, succeeded: 9 }, rule: { given: 10, succeeded: 3 } };
    expect(openingLevel(p, 'distribute', NOW)).toBe(2);
  });
});

describe('help session', () => {
  it('jumps to the step of a diagnosed mistake with its targeted reminder', () => {
    const q = bracketQuestion();
    const code = 'sign-move';
    const s = startSession(q.solutionPaths, defaultLearner(), { diagnosis: code }, NOW);
    expect(s.stepIndex).toBe(1);
    expect(s.level).toBe(1);
    const item = currentHelp(q.solutionPaths, s, q.finalValues);
    expect(item.kind === 'hint' && item.text).toBe(q.solutionPaths[0].steps[1].fixes![code]);
  });

  it('walks every rung, step after step, then is exhausted — never past the last step', () => {
    const q = bracketQuestion();
    const p = withMastery({ distribute: 0.9, 'move-term-sign': 0.9, 'divide-coefficient': 0.9 });
    let s = startSession(q.solutionPaths, p, {}, NOW);
    const seen: string[] = [];
    for (let i = 0; i < 20 && s.mode !== 'exhausted'; i++) {
      const item = currentHelp(q.solutionPaths, s, q.finalValues);
      seen.push(`${item.kind}${'stepIndex' in item ? item.stepIndex : ''}`);
      s = moreHelp(q.solutionPaths, s, p, NOW);
    }
    expect(seen).toEqual(['hint0', 'hint0', 'hint0', 'blank0', 'hint1', 'hint1', 'hint1', 'blank1', 'hint2', 'hint2', 'hint2', 'blank2']);
    expect(currentHelp(q.solutionPaths, s, q.finalValues).kind).toBe('exhausted');
    expect(helpRungs(s)).toBe(4);
  });

  it('a correct blank moves on; the last one leaves the final step to her', () => {
    const q = bracketQuestion();
    const p = defaultLearner();
    const steps = q.solutionPaths[0].steps;
    let s = startSession(q.solutionPaths, p, { fromStep: 2 }, NOW);
    s = { ...s, level: 3 };
    const res = answerBlank(q.solutionPaths, s, String(steps[2].blank.answer), p, NOW);
    expect(res.correct).toBe(true);
    expect(res.session.mode).toBe('ready');
  });

  it('two wrong blanks break the step into sub-steps', () => {
    const q = bracketQuestion();
    const p = defaultLearner();
    let s: TutorSession = { ...startSession(q.solutionPaths, p, {}, NOW), level: 3 };
    s = answerBlank(q.solutionPaths, s, '999', p, NOW).session;
    expect(s.mode).toBe('ladder');
    s = answerBlank(q.solutionPaths, s, '998', p, NOW).session;
    expect(s.mode).toBe('subSteps');
    const item = currentHelp(q.solutionPaths, s, q.finalValues);
    expect(item.kind === 'subStep' && item.text).toBe(q.solutionPaths[0].steps[0].subSteps[0]);
  });

  it('getNextHelp starts with a diagnosis, then advances', () => {
    const q = bracketQuestion();
    const wrong = q.distractors.find((d) => d.code === 'divide-wrong')!;
    const first = getNextHelp(q, null, defaultLearner(), String(wrong.value), NOW);
    expect(first.session.diagnosis).toBe('divide-wrong');
    expect(first.item.kind === 'hint' && first.item.stepIndex).toBe(2);
    const second = getNextHelp(q, first.session, defaultLearner(), undefined, NOW);
    expect(second.session.level).toBe(2);
  });

  it('replaces a hint that would reveal the answer', () => {
    const q = bracketQuestion();
    const answer = q.finalValues.x;
    const paths: SolutionPath[] = [{ ...q.solutionPaths[0], steps: q.solutionPaths[0].steps.map((st) => ({ ...st, hints: [`$x = ${answer}$`, st.hints[1], st.hints[2]] as [string, string, string] })) }];
    const s = startSession(paths, withMastery({ distribute: 0.9 }), {}, NOW);
    const item = currentHelp(paths, s, q.finalValues);
    expect(item.kind === 'hint' && item.text).not.toContain(String(answer));
  });
});
