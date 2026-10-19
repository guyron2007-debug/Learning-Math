import type { Difficulty, GeneratorDef, Step, StepProblem } from '../../engine/types';
import { type Rng, randInt, randNonZero, randSigned } from '../../engine/rng';
import { div, lcm, qLatex, add, toNumber } from '../../engine/rational';
import { linExpr, scaled, m } from '../../engine/format';
import { makeCodedChoices } from '../../engine/choices';
import type { HelpStep } from '../../tutor/types';
import {
  backSubstituteStep,
  clearDenominatorStep,
  collectStep,
  commonDenominatorStep,
  distributeStep,
  divideStep,
  eliminationScaleStep,
  eliminationSubtractStep,
} from '../../tutor/equationSteps';
import { makeSystem, systemLatex } from './system';

/** A multiple-choice step; each distractor is [misconception code, LaTeX]. */
function step(
  rng: Rng,
  prompt: string,
  correct: string,
  distractors: Array<[string, string]>,
  fallback: () => string,
  help: HelpStep,
  explanation: string,
): Step {
  const { options, correctIndex, optionCodes } = makeCodedChoices(
    rng,
    m(correct),
    distractors.map(([code, value]) => ({ code, value: m(value) })),
    () => m(fallback()),
  );
  return { prompt, options, correctIndex, optionCodes, help, explanation };
}

const xPlus = (a: number) => linExpr([[1, 'x'], [a, '']]);
const eqn = (k: number, r: number | string) => `${linExpr([[k, 'x']])} = ${r}`;
const num = (n: number) => m(String(n));

/** a(x + b) = c·x + d, solved in three steps. */
export function linearSteps(d: Difficulty, rng: Rng): StepProblem {
  const x = randInt(rng, -8, 10);
  const a = randSigned(rng, 2, d >= 4 ? 9 : 6);
  const b = randNonZero(rng, -9, 9);
  const c = randNonZero(rng, -7, 7, [a]);
  const dd = a * (x + b) - c * x;
  const rhs = linExpr([[c, 'x'], [dd, '']]);
  const latex = `${scaled(a, xPlus(b))} = ${rhs}`;
  const k = a - c;
  const r = dd - a * b;
  const sol = div(r, k);
  const answer = toNumber(sol);

  const steps: Step[] = [
    step(
      rng,
      'פתחי את הסוגריים. מה מקבלים?',
      `${linExpr([[a, 'x'], [a * b, '']])} = ${rhs}`,
      [
        ['distribute-partial', `${linExpr([[a, 'x'], [b, '']])} = ${rhs}`],
        ['distribute-sign', `${linExpr([[a, 'x'], [-a * b, '']])} = ${rhs}`],
        ['distribute-coef', `${linExpr([[1, 'x'], [a * b, '']])} = ${rhs}`],
      ],
      () => `${linExpr([[a, 'x'], [a * b + randSigned(rng, 1, 5), '']])} = ${rhs}`,
      distributeStep(rng, [[a, b]]),
      `${m(`${a} \\cdot ${b < 0 ? `(${b})` : b} = ${a * b}`)}, ולכן מקבלים ${m(`${linExpr([[a, 'x'], [a * b, '']])} = ${rhs}`)}.`,
    ),
    step(
      rng,
      `העבירי את ה-${m('x')}-ים לשמאל ואת המספרים לימין. מה מקבלים?`,
      eqn(k, r),
      [
        ['coef-sign', eqn(a + c, r)],
        ['sign-move', eqn(k, dd + a * b)],
        ['sign-move', eqn(a + c, dd + a * b)],
      ],
      () => eqn(k, r + randSigned(rng, 1, 6)),
      collectStep(rng, { A: a, B: a * b, C: c, D: dd }, [answer]),
      `${m(`${a}x ${c < 0 ? '+' : '-'} ${Math.abs(c)}x = ${k}x`)} ו-${m(`${dd} ${a * b < 0 ? '+' : '-'} ${Math.abs(a * b)} = ${r}`)}.`,
    ),
    step(
      rng,
      `מצאי את ${m('x')}.`,
      `x = ${qLatex(sol)}`,
      [
        ['divide-inverted', `x = ${qLatex(r === 0 ? 1 : div(k, r))}`],
        ['subtract-instead', `x = ${qLatex(r - k)}`],
        ['divide-sign', `x = ${qLatex(div(-r, k))}`],
      ],
      () => `x = ${qLatex(add(sol, randSigned(rng, 1, 4)))}`,
      divideStep(rng, k, r, [answer]),
      `${m(`x = \\frac{${r}}{${k}} = ${qLatex(sol)}`)}`,
    ),
  ];

  return {
    kind: 'steps',
    generatorId: 'steps.linear',
    topic: 'equations',
    difficulty: d,
    prompt: 'פתרי את המשוואה צעד אחר צעד',
    latex,
    steps,
    finalAnswer: m(`x = ${qLatex(sol)}`),
    skills: steps.map((st) => st.help.skill),
    finalValues: { x: answer },
  };
}

/** (x + a)/p + (x + b)/q = c, solved in four steps. */
export function fractionSteps(d: Difficulty, rng: Rng): StepProblem {
  const pairs: Array<[number, number]> = d <= 3 ? [[2, 3], [3, 4], [2, 5], [3, 5]] : [[4, 6], [6, 4], [4, 10], [6, 9], [6, 8]];
  const [p, q] = pairs[randInt(rng, 0, pairs.length - 1)];
  const L = lcm(p, q);
  const x = randInt(rng, -6, 10);
  const k1 = randInt(rng, -3, 4);
  const k2 = randInt(rng, -3, 4);
  const a = p * k1 - x;
  const b = q * k2 - x;
  const c = k1 + k2;
  const s1 = L / p, s2 = L / q;
  const K = s1 + s2;
  const B = s1 * a + s2 * b;
  const latex = `\\frac{${xPlus(a)}}{${p}} + \\frac{${xPlus(b)}}{${q}} = ${c}`;
  const cleared = (u: number, v: number, rhs: number) => `${u}(${xPlus(a)}) + ${v}(${xPlus(b)}) = ${rhs}`;
  const combined = (constant: number, coef = K) => `${linExpr([[coef, 'x'], [constant, '']])} = ${c * L}`;

  const steps: Step[] = [
    {
      ...makeCodedChoices(
        rng,
        num(L),
        [
          { code: 'lcd-product', value: num(p * q) },
          { code: 'lcd-sum', value: num(p + q) },
          { code: 'lcd-max', value: num(Math.max(p, q)) },
          { code: 'lcd-double', value: num(2 * L) },
        ],
        () => num(L + randInt(rng, 1, 9)),
      ),
      prompt: 'מהו המכנה המשותף הקטן ביותר?',
      help: commonDenominatorStep(p, q, L),
      explanation: `${num(L)} מתחלק ב-${num(p)} וגם ב-${num(q)}, ואין מספר קטן ממנו שעושה את זה.`,
    },
    step(
      rng,
      `כפלי כל איבר ב-${num(L)}. מה מקבלים?`,
      cleared(s1, s2, c * L),
      [
        ['clear-rhs', cleared(s1, s2, c)],
        ['clear-swap', cleared(s2, s1, c * L)],
        ['clear-none', cleared(1, 1, c * L)],
      ],
      () => cleared(s1, s2, c * L + randSigned(rng, 1, 6)),
      clearDenominatorStep(rng, [p, q], L, c),
      `${m(`${L} \\cdot \\frac{${xPlus(a)}}{${p}} = ${s1}(${xPlus(a)})`)}, וכך גם לשבר השני. הצד הימני: ${m(`${c} \\cdot ${L} = ${c * L}`)}.`,
    ),
    step(
      rng,
      'פתחי סוגריים וכנסי איברים דומים.',
      combined(B),
      [
        ['distribute-partial', combined(a + b)],
        ['distribute-sign', combined(s1 * a - s2 * b)],
        ['combine-coef', combined(B, 2)],
      ],
      () => combined(B + randSigned(rng, 1, 5)),
      distributeStep(rng, [[s1, a], [s2, b]]),
      `${m(`${s1} \\cdot ${a < 0 ? `(${a})` : a} + ${s2} \\cdot ${b < 0 ? `(${b})` : b} = ${B}`)}`,
    ),
    step(
      rng,
      `מצאי את ${m('x')}.`,
      `x = ${x}`,
      [
        ['answer-sign', `x = ${-x}`],
        ['sign-move', `x = ${qLatex(div(c * L + B, K))}`],
        ['partial', `x = ${c * L - B}`],
      ],
      () => `x = ${x + randSigned(rng, 1, 4)}`,
      collectStep(rng, { A: K, B, C: 0, D: c * L }, [x]),
      `${m(eqn(K, c * L - B))}, ולכן ${m(`x = ${x}`)}.`,
    ),
  ];

  return {
    kind: 'steps',
    generatorId: 'steps.fractions',
    topic: 'equations',
    difficulty: d,
    prompt: 'פתרי את המשוואה צעד אחר צעד',
    latex,
    steps,
    finalAnswer: m(`x = ${x}`),
    skills: [...new Set(steps.map((st) => st.help.skill))],
    finalValues: { x },
  };
}

/** Elimination: scale the first equation so the y-coefficients match, subtract, back-substitute. */
export function systemSteps(d: Difficulty, rng: Rng): StepProblem {
  let s = makeSystem(Math.max(3, d) as Difficulty, rng);
  const b1 = randNonZero(rng, -2, 2);
  const kk = randSigned(rng, 2, 4);
  const a1 = randNonZero(rng, -5, 5);
  let a2 = randNonZero(rng, -6, 6);
  if (a2 === kk * a1) a2 += 1;
  if (a2 === 0) a2 = 1;
  s = { ...s, a1, b1, a2, b2: kk * b1, c1: a1 * s.x + b1 * s.y, c2: a2 * s.x + kk * b1 * s.y };

  const cx = s.a2 - kk * s.a1;
  const cr = s.c2 - kk * s.c1;
  const subst = `${linExpr([[s.a1 * s.x, ''], [s.b1, 'y']])} = ${s.c1}`;

  const steps: Step[] = [
    {
      ...makeCodedChoices(
        rng,
        num(kk),
        [
          { code: 'scale-sign', value: num(-kk) },
          { code: 'scale-coef', value: num(s.b2) },
          { code: 'arithmetic', value: num(kk + 1) },
          { code: 'scale-diff', value: num(s.b2 - s.b1) },
        ],
        () => num(kk + randSigned(rng, 2, 5)),
      ),
      prompt: `בכמה צריך לכפול את המשוואה הראשונה כדי שהמקדם של ${m('y')} יהיה זהה בשתי המשוואות?`,
      summary: `כופלים את המשוואה הראשונה ב-${m(kk < 0 ? `(${kk})` : String(kk))}: ${m(`${linExpr([[kk * s.a1, 'x'], [kk * s.b1, 'y']])} = ${kk * s.c1}`)}`,
      help: eliminationScaleStep(rng, s, kk),
      explanation: `${m(`${s.b1} \\cdot ${kk < 0 ? `(${kk})` : kk} = ${s.b2}`)}`,
    },
    step(
      rng,
      'חסרי: המשוואה השנייה פחות הראשונה המוכפלת. מה מקבלים?',
      eqn(cx, cr),
      [
        ['elim-add', eqn(s.a2 + kk * s.a1, s.c2 + kk * s.c1)],
        ['elim-rhs', eqn(cx, s.c2 - s.c1)],
        ['elim-coef', eqn(s.a2 - s.a1, cr)],
      ],
      () => eqn(cx, cr + randSigned(rng, 1, 6)),
      eliminationSubtractStep(rng, cx, cr),
      `${m(`${s.a2} - ${kk}\\cdot${s.a1 < 0 ? `(${s.a1})` : s.a1} = ${cx}`)} ו-${m(`${s.c2} - ${kk}\\cdot${s.c1 < 0 ? `(${s.c1})` : s.c1} = ${cr}`)}`,
    ),
    step(
      rng,
      `מצאי את ${m('x')}.`,
      `x = ${s.x}`,
      [
        ['answer-sign', `x = ${-s.x}`],
        ['divide-inverted', `x = ${qLatex(cr === 0 ? 1 : div(cx, cr))}`],
        ['subtract-instead', `x = ${cr - cx}`],
      ],
      () => `x = ${s.x + randSigned(rng, 1, 4)}`,
      divideStep(rng, cx, cr, [s.x]),
      m(`x = \\frac{${cr}}{${cx}} = ${s.x}`),
    ),
    step(
      rng,
      `הציבי את ה-${m('x')} שמצאת במשוואה הראשונה ומצאי את ${m('y')}.`,
      `y = ${s.y}`,
      [
        ['sign-y', `y = ${-s.y}`],
        ['arithmetic', `y = ${s.y + 1}`],
        ['partial', `y = ${s.c1 - s.a1 * s.x}`],
      ],
      () => `y = ${s.y + randSigned(rng, 2, 5)}`,
      backSubstituteStep(rng, s),
      `${m(subst)}, ולכן ${m(`y = ${s.y}`)}.`,
    ),
  ];

  return {
    kind: 'steps',
    generatorId: 'steps.system',
    topic: 'equations',
    difficulty: d,
    prompt: 'פתרי את מערכת המשוואות בשיטת השוואת מקדמים',
    latex: systemLatex(s),
    steps,
    finalAnswer: m(`(x, y) = (${s.x}, ${s.y})`),
    skills: [...new Set(steps.map((st) => st.help.skill))],
    finalValues: { x: s.x, y: s.y },
  };
}

export const linearStepsGenerator: GeneratorDef<StepProblem> = {
  id: 'steps.linear', topic: 'equations', title: 'משוואה עם סוגריים', minDifficulty: 2, maxDifficulty: 5, generate: linearSteps,
};
export const fractionStepsGenerator: GeneratorDef<StepProblem> = {
  id: 'steps.fractions', topic: 'equations', title: 'משוואה עם שברים', minDifficulty: 2, maxDifficulty: 5, generate: fractionSteps,
};
export const systemStepsGenerator: GeneratorDef<StepProblem> = {
  id: 'steps.system', topic: 'equations', title: 'מערכת משוואות', minDifficulty: 2, maxDifficulty: 5, generate: systemSteps,
};
