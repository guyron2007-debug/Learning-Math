import type { Difficulty, GeneratorDef, Step, StepProblem } from '../../engine/types';
import { type Rng, randInt, randNonZero, randSigned } from '../../engine/rng';
import { div, lcm, qLatex, add } from '../../engine/rational';
import { linExpr, scaled, m } from '../../engine/format';
import { makeChoices } from '../../engine/choices';
import { makeSystem, systemLatex } from './system';

function step(rng: Rng, prompt: string, correct: string, distractors: string[], fallback: () => string, hint: string, explanation: string): Step {
  const { options, correctIndex } = makeChoices(rng, m(correct), distractors.map(m), () => m(fallback()));
  return { prompt, options, correctIndex, hint, explanation };
}

const xPlus = (a: number) => linExpr([[1, 'x'], [a, '']]);
const eqn = (k: number, r: number | string) => `${linExpr([[k, 'x']])} = ${r}`;

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

  const steps: Step[] = [
    step(
      rng,
      'פתחי את הסוגריים. מה מקבלים?',
      `${linExpr([[a, 'x'], [a * b, '']])} = ${rhs}`,
      [
        `${linExpr([[a, 'x'], [b, '']])} = ${rhs}`,
        `${linExpr([[a, 'x'], [-a * b, '']])} = ${rhs}`,
        `${linExpr([[1, 'x'], [a * b, '']])} = ${rhs}`,
      ],
      () => `${linExpr([[a, 'x'], [a * b + randSigned(rng, 1, 5), '']])} = ${rhs}`,
      `כופלים את ${m(String(a))} גם ב-${m('x')} וגם ב-${m(String(b))}.`,
      `${m(`${a} \\cdot ${b < 0 ? `(${b})` : b} = ${a * b}`)}, ולכן מקבלים ${m(`${linExpr([[a, 'x'], [a * b, '']])} = ${rhs}`)}.`,
    ),
    step(
      rng,
      `העבירי את ה-${m('x')}-ים לשמאל ואת המספרים לימין. מה מקבלים?`,
      eqn(k, r),
      [eqn(a + c, r), eqn(k, dd + a * b), eqn(a + c, dd + a * b)],
      () => eqn(k, r + randSigned(rng, 1, 6)),
      'איבר שעובר אגף מחליף סימן.',
      `${m(`${a}x ${c < 0 ? '+' : '-'} ${Math.abs(c)}x = ${k}x`)} ו-${m(`${dd} ${a * b < 0 ? '+' : '-'} ${Math.abs(a * b)} = ${r}`)}.`,
    ),
    step(
      rng,
      `מצאי את ${m('x')}.`,
      `x = ${qLatex(sol)}`,
      [
        `x = ${qLatex(r === 0 ? 1 : div(k, r))}`,
        `x = ${qLatex(r - k)}`,
        `x = ${qLatex(div(-r, k))}`,
      ],
      () => `x = ${qLatex(add(sol, randSigned(rng, 1, 4)))}`,
      `מחלקים את שני האגפים במקדם של ${m('x')}, כלומר ב-${m(String(k))}.`,
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
  const latex = `\\frac{${xPlus(a)}}{${p}} + \\frac{${xPlus(b)}}{${q}} = ${c}`;
  const cleared = (u: number, v: number, rhs: number) => `${u}(${xPlus(a)}) + ${v}(${xPlus(b)}) = ${rhs}`;
  const combined = (u: number, v: number) => `${linExpr([[s1 + s2, 'x'], [u * a + v * b, '']])} = ${c * L}`;

  const steps: Step[] = [
    {
      ...makeChoices(rng, m(String(L)), [p * q, p + q, Math.max(p, q), 2 * L].filter((n) => n !== L).map((n) => m(String(n))), () => m(String(L + randInt(rng, 1, 9)))),
      prompt: 'מהו המכנה המשותף הקטן ביותר?',
      summary: `מכנה משותף: ${m(String(L))}`,
      hint: `חפשי את המספר הקטן ביותר שמתחלק גם ב-${m(String(p))} וגם ב-${m(String(q))}.`,
      explanation: `${m(String(L))} מתחלק ב-${m(String(p))} וגם ב-${m(String(q))}, ואין מספר קטן ממנו שעושה את זה.`,
    },
    step(
      rng,
      `כפלי כל איבר ב-${m(String(L))}. מה מקבלים?`,
      cleared(s1, s2, c * L),
      [cleared(s1, s2, c), cleared(s2, s1, c * L), cleared(1, 1, c * L)],
      () => cleared(s1, s2, c * L + randSigned(rng, 1, 6)),
      `${m(`${L} : ${p} = ${s1}`)}. אל תשכחי לכפול גם את האגף הימני!`,
      `${m(`${L} \\cdot \\frac{${xPlus(a)}}{${p}} = ${s1}(${xPlus(a)})`)}, וכך גם לשבר השני. האגף הימני: ${m(`${c} \\cdot ${L} = ${c * L}`)}.`,
    ),
    step(
      rng,
      'פתחי סוגריים וכנסי איברים דומים.',
      combined(s1, s2),
      [`${linExpr([[s1 + s2, 'x'], [a + b, '']])} = ${c * L}`, `${linExpr([[s1 + s2, 'x'], [s1 * a - s2 * b, '']])} = ${c * L}`, `${linExpr([[2, 'x'], [s1 * a + s2 * b, '']])} = ${c * L}`],
      () => `${linExpr([[s1 + s2, 'x'], [s1 * a + s2 * b + randSigned(rng, 1, 5), '']])} = ${c * L}`,
      `${m(`${s1}x + ${s2}x = ${s1 + s2}x`)}. עכשיו חשבי את המספרים.`,
      `${m(`${s1} \\cdot ${a < 0 ? `(${a})` : a} + ${s2} \\cdot ${b < 0 ? `(${b})` : b} = ${s1 * a + s2 * b}`)}`,
    ),
    step(
      rng,
      `מצאי את ${m('x')}.`,
      `x = ${x}`,
      [`x = ${-x}`, `x = ${qLatex(div(c * L + s1 * a + s2 * b, s1 + s2))}`, `x = ${c * L - s1 * a - s2 * b}`],
      () => `x = ${x + randSigned(rng, 1, 4)}`,
      `העבירי את ${m(String(s1 * a + s2 * b))} אגף, ואז חלקי ב-${m(String(s1 + s2))}.`,
      `${m(eqn(s1 + s2, c * L - s1 * a - s2 * b))}, ולכן ${m(`x = ${x}`)}.`,
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
      ...makeChoices(rng, m(String(kk)), [-kk, s.b2, kk + 1, s.b2 - s.b1].filter((n) => n !== kk).map((n) => m(String(n))), () => m(String(kk + randSigned(rng, 2, 5)))),
      prompt: `בכמה צריך לכפול את המשוואה הראשונה כדי שהמקדם של ${m('y')} יהיה זהה בשתי המשוואות?`,
      summary: `כופלים את המשוואה הראשונה ב-${m(kk < 0 ? `(${kk})` : String(kk))}: ${m(`${linExpr([[kk * s.a1, 'x'], [kk * s.b1, 'y']])} = ${kk * s.c1}`)}`,
      hint: `המקדם של ${m('y')} בראשונה הוא ${m(String(s.b1))}, ובשנייה ${m(String(s.b2))}.`,
      explanation: `${m(`${s.b1} \\cdot ${kk < 0 ? `(${kk})` : kk} = ${s.b2}`)}`,
    },
    step(
      rng,
      'חסרי: המשוואה השנייה פחות הראשונה המוכפלת. מה מקבלים?',
      eqn(cx, cr),
      [eqn(s.a2 + kk * s.a1, s.c2 + kk * s.c1), eqn(cx, s.c2 - s.c1), eqn(s.a2 - s.a1, cr)],
      () => eqn(cx, cr + randSigned(rng, 1, 6)),
      `ה-${m('y')}-ים מתבטלים. חסרי בנפרד את מקדמי ה-${m('x')} ואת המספרים.`,
      `${m(`${s.a2} - ${kk}\\cdot${s.a1 < 0 ? `(${s.a1})` : s.a1} = ${cx}`)} ו-${m(`${s.c2} - ${kk}\\cdot${s.c1 < 0 ? `(${s.c1})` : s.c1} = ${cr}`)}`,
    ),
    step(
      rng,
      `מצאי את ${m('x')}.`,
      `x = ${s.x}`,
      [`x = ${-s.x}`, `x = ${qLatex(cr === 0 ? 1 : div(cx, cr))}`, `x = ${cr - cx}`],
      () => `x = ${s.x + randSigned(rng, 1, 4)}`,
      `חלקי ב-${m(String(cx))}.`,
      m(`x = \\frac{${cr}}{${cx}} = ${s.x}`),
    ),
    step(
      rng,
      `הציבי את ${m(`x = ${s.x}`)} במשוואה הראשונה ומצאי את ${m('y')}.`,
      `y = ${s.y}`,
      [`y = ${-s.y}`, `y = ${s.y + 1}`, `y = ${s.c1 - s.a1 * s.x}`],
      () => `y = ${s.y + randSigned(rng, 2, 5)}`,
      `אחרי ההצבה: ${m(subst)}`,
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
