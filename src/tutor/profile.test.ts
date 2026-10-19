import { describe, expect, it } from 'vitest';
import { activeMisconceptions, defaultLearner, effectiveMastery, recordOutcome } from './profile';

const NOW = new Date('2026-10-19T12:00:00Z');

describe('mastery', () => {
  it('moves by the spec amounts', () => {
    const p = defaultLearner();
    const at = (correct: boolean, helpRungs: number) =>
      recordOutcome(p, { skills: ['distribute'], correct, helpRungs }, NOW).skills.distribute!.mastery;
    expect(at(true, 0)).toBeCloseTo(0.58);
    expect(at(true, 1)).toBeCloseTo(0.54);
    expect(at(true, 3)).toBeCloseTo(0.51);
    expect(at(false, 0)).toBeCloseTo(0.45);
  });
  it('stays within 0..1', () => {
    let p = defaultLearner();
    for (let i = 0; i < 20; i++) p = recordOutcome(p, { skills: ['distribute'], correct: true, helpRungs: 0 }, NOW);
    expect(p.skills.distribute!.mastery).toBe(1);
  });
  it('decays 0.02 per unpracticed week', () => {
    const p = recordOutcome(defaultLearner(), { skills: ['distribute'], correct: true, helpRungs: 0 }, NOW);
    const later = new Date(NOW.getTime() + 3 * 7 * 24 * 3600 * 1000 + 1000);
    expect(effectiveMastery(p, 'distribute', later)).toBeCloseTo(0.58 - 0.06);
  });
  it('tracks help needed as a moving average', () => {
    let p = recordOutcome(defaultLearner(), { skills: ['distribute'], correct: true, helpRungs: 4 }, NOW);
    expect(p.skills.distribute!.helpLevelNeeded).toBe(4);
    p = recordOutcome(p, { skills: ['distribute'], correct: true, helpRungs: 0 }, NOW);
    expect(p.skills.distribute!.helpLevelNeeded).toBeCloseTo(2.8);
  });
});

describe('misconceptions and help types', () => {
  it('a misconception seen 3 times becomes active', () => {
    let p = defaultLearner();
    for (let i = 0; i < 2; i++) p = recordOutcome(p, { skills: [], correct: false, helpRungs: 0, misconception: 'sign-move' }, NOW);
    expect(activeMisconceptions(p)).toEqual([]);
    p = recordOutcome(p, { skills: [], correct: false, helpRungs: 0, misconception: 'sign-move' }, NOW);
    expect(activeMisconceptions(p)).toEqual(['sign-move']);
  });
  it('counts success after each kind of help', () => {
    let p = recordOutcome(defaultLearner(), { skills: [], correct: true, helpRungs: 2, helpTypes: ['rule', 'example'] }, NOW);
    p = recordOutcome(p, { skills: [], correct: false, helpRungs: 1, helpTypes: ['rule'] }, NOW);
    expect(p.helpTypes.rule).toEqual({ given: 2, succeeded: 1 });
    expect(p.helpTypes.example).toEqual({ given: 1, succeeded: 1 });
  });
});
