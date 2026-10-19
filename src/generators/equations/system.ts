import type { Difficulty, GeneratorDef, Question } from '../../engine/types';
import { type Rng, randInt, randNonZero, randSigned } from '../../engine/rng';
import { linExpr, m } from '../../engine/format';
import { makeCodedChoices } from '../../engine/choices';
import type { SolutionPath } from '../../tutor/types';
import {
  backSubstituteStep,
  divideStep,
  eliminationScaleStep,
  eliminationSubtractStep,
  substitutionIsolateStep,
  substitutionPlugStep,
} from '../../tutor/equationSteps';

export interface LinearSystem {
  a1: number; b1: number; c1: number;
  a2: number; b2: number; c2: number;
  x: number; y: number;
}

export const systemLatex = (s: LinearSystem) =>
  `\\begin{cases} ${linExpr([[s.a1, 'x'], [s.b1, 'y']])} = ${s.c1} \\\\ ${linExpr([[s.a2, 'x'], [s.b2, 'y']])} = ${s.c2} \\end{cases}`;

export function makeSystem(d: Difficulty, rng: Rng): LinearSystem {
  const x = randInt(rng, -6, 8);
  const y = randInt(rng, -6, 8);
  let a1: number, b1: number, a2: number, b2: number;
  if (d <= 1) {
    [a1, b1, a2, b2] = [1, 1, 1, -1];
  } else if (d === 2) {
    // One equation has y with coefficient 1, handy for substitution.
    a1 = randNonZero(rng, -5, 5); b1 = 1;
    a2 = randNonZero(rng, -5, 5); b2 = randNonZero(rng, -4, 4);
  } else {
    const max = d === 3 ? 5 : 8;
    a1 = randNonZero(rng, -max, max); b1 = randNonZero(rng, -max, max);
    a2 = randNonZero(rng, -max, max); b2 = randNonZero(rng, -max, max);
  }
  if (a1 * b2 - a2 * b1 === 0) return makeSystem(d, rng);
  return { a1, b1, c1: a1 * x + b1 * y, a2, b2, c2: a2 * x + b2 * y, x, y };
}

/**
 * Solution paths for a 2×2 system: elimination always; substitution too when y in the
 * first equation has coefficient ±1 (so isolating it creates no fractions).
 */
export function systemPaths(rng: Rng, s: LinearSystem): SolutionPath[] {
  const avoid = [s.x];
  const cx = s.a1 * s.b2 - s.a2 * s.b1;
  const cr = s.c1 * s.b2 - s.c2 * s.b1;
  const paths: SolutionPath[] = [
    {
      id: 'elimination',
      title: 'השוואת מקדמים',
      steps: [
        eliminationScaleStep(rng, s, s.b2),
        eliminationSubtractStep(rng, cx, cr),
        divideStep(rng, cx, cr, avoid),
        backSubstituteStep(rng, s),
      ],
    },
  ];
  if (Math.abs(s.b1) === 1) {
    const sx = s.a2 - s.b1 * s.b2 * s.a1;
    const sr = s.c2 - s.b1 * s.b2 * s.c1;
    paths.push({
      id: 'substitution',
      title: 'הצבה',
      steps: [substitutionIsolateStep(rng, s), substitutionPlugStep(rng, sx, sr), divideStep(rng, sx, sr, avoid), backSubstituteStep(rng, s)],
    });
  }
  return paths;
}

const pair = (x: number, y: number) => m(`(x, y) = (${x}, ${y})`);

export function systemQuestion(d: Difficulty, rng: Rng): Question {
  const s = makeSystem(d, rng);
  const { options, correctIndex, optionCodes } = makeCodedChoices(
    rng,
    pair(s.x, s.y),
    [
      { code: 'swap-xy', value: pair(s.y, s.x) },
      { code: 'sign-x', value: pair(-s.x, s.y) },
      { code: 'sign-y', value: pair(s.x, -s.y) },
      { code: 'arithmetic', value: pair(s.x + 1, s.y - 1) },
    ],
    () => pair(s.x + randSigned(rng, 1, 3), s.y + randSigned(rng, 0, 3)),
  );
  const paths = systemPaths(rng, s);
  return {
    kind: 'question',
    generatorId: 'eq.system',
    topic: 'equations',
    difficulty: d,
    prompt: 'מהו פתרון מערכת המשוואות?',
    latex: systemLatex(s),
    answer: { kind: 'choice', options, correctIndex },
    solution: [
      m(systemLatex(s)),
      `מכפילים את המשוואה הראשונה ב-${m(String(s.b2))} ואת השנייה ב-${m(String(s.b1))} כדי להשוות את מקדמי ${m('y')}.`,
      `מחסרים: ${m(`${s.a1 * s.b2 - s.a2 * s.b1}x = ${s.c1 * s.b2 - s.c2 * s.b1}`)}, ולכן ${m(`x = ${s.x}`)}`,
      `מציבים במשוואה הראשונה: ${m(`${linExpr([[s.a1 * s.x, ''], [s.b1, 'y']])} = ${s.c1}`)}, ולכן ${m(`y = ${s.y}`)}`,
      pair(s.x, s.y),
    ],
    skills: [...new Set(paths.flatMap((p) => p.steps.map((st) => st.skill)))],
    distractors: options.flatMap((o, i) => (optionCodes[i] ? [{ code: optionCodes[i]!, value: o }] : [])),
    solutionPaths: paths,
    finalValues: { x: s.x, y: s.y },
  };
}

export const systemGenerator: GeneratorDef<Question> = {
  id: 'eq.system',
  topic: 'equations',
  title: 'מערכת שתי משוואות',
  minDifficulty: 1,
  maxDifficulty: 5,
  generate: systemQuestion,
};
