/**
 * 5-unit (advanced track) equation templates: short multiplication that cancels x²,
 * x in the denominator with a difference of squares, parameters, and word problems.
 */
import type { Difficulty, GeneratorDef, Question } from '../../engine/types';
import { type Rng, pick, randInt, randNonZero, randSigned } from '../../engine/rng';
import { type Q, div, lcm, mul, qLatex, toNumber } from '../../engine/rational';
import { linExpr, scaled, paren, m } from '../../engine/format';
import type { Distractor, HelpStep, SkillId } from '../../tutor/types';
import { numericDistractors } from '../../tutor/distractors';
import { clearDenominatorStep, domainStep, expandStep } from '../../tutor/equationSteps';
import { linearHelpSteps, linearSkills } from './linear';

const xPlus = (a: number) => linExpr([[1, 'x'], [a, '']]);
const frac = (top: string | number, bottom: string | number) => `\\frac{${top}}{${bottom}}`;
/** Appends a signed expression: "+ 3x - 2" / "- 3x - 2". */
const plus = (expr: string) => (expr.startsWith('-') ? ` - ${expr.slice(1)}` : ` + ${expr}`);
const SOLVE_X = `פתרי את המשוואה ומצאי את ${m('x')}`;

interface Linear {
  A: number;
  B: number;
  C: number;
  D: number;
  products?: Array<[number, number]>;
}

type Candidates = Array<[string, (() => Q | number) | null]>;

/** Typical slips once the equation is linear (A·x + B = C·x + D), plus template-specific ones first. */
function linearDistractors(f: Linear, answer: number, extra: Candidates = []): Distractor[] {
  const k = f.A - f.C;
  const r = f.D - f.B;
  return numericDistractors(answer, [
    ...extra,
    ['sign-move', f.B !== 0 ? () => div(f.D + f.B, k) : null],
    ['divide-wrong', k !== 1 ? () => mul(r, k) : null],
    ['divide-sign', () => div(-r, k)],
  ]);
}

function makeQuestion(
  generatorId: string,
  d: Difficulty,
  parts: {
    prompt: string;
    latex?: string;
    answer: number | Q;
    solution: string[];
    steps: HelpStep[];
    distractors: Distractor[];
    unknown?: string;
    pathTitle?: string;
  },
): Question {
  const value = toNumber(parts.answer);
  const unknown = parts.unknown ?? 'x';
  return {
    kind: 'question',
    generatorId,
    topic: 'equations',
    difficulty: d,
    prompt: parts.prompt,
    latex: parts.latex,
    answer: { kind: 'number', value, display: `${unknown} = ${qLatex(parts.answer)}` },
    solution: parts.solution,
    skills: linearSkills(parts.steps),
    distractors: parts.distractors,
    solutionPaths: [{ id: 'main', title: parts.pathTitle ?? `בידוד ${unknown}`, steps: parts.steps }],
    finalValues: { [unknown]: value },
  };
}

function helpStep(
  skill: SkillId,
  label: string,
  hints: [string, string, string],
  blank: { latex: string; answer: number },
  subSteps: string[],
  fixes?: Record<string, string>,
): HelpStep {
  return { skill, label, hints, blank, subSteps, fixes };
}

// ---------- eq.shortMult: x² cancels after expanding ----------

const sq = (p: number, a: number) => `(${linExpr([[p, 'x'], [a, '']])})^2`;
const prod = (a: number, b: number) => `(${xPlus(a)})(${xPlus(b)})`;

export function shortMultQuestion(d: Difficulty, rng: Rng): Question {
  for (;;) {
    let latex: string;
    let expanded: string;
    let f: Linear;
    const expands: Array<[[number, number], [number, number]]> = [];
    const extra: Candidates = [];
    const x = randNonZero(rng, -10, 10);

    if (d === 1) {
      // (x + a)² = x² + k
      const a = randNonZero(rng, -9, 9);
      const k = 2 * a * x + a * a;
      latex = `${sq(1, a)} = ${linExpr([[1, 'x^2'], [k, '']])}`;
      expanded = `${linExpr([[1, 'x^2'], [2 * a, 'x'], [a * a, '']])} = ${linExpr([[1, 'x^2'], [k, '']])}`;
      f = { A: 2 * a, B: a * a, C: 0, D: k };
      expands.push([[1, a], [1, a]]);
      extra.push(['square-half-middle', () => div(k - a * a, a)]);
    } else if (d === 2) {
      // (x + a)(x + b) = (x + c)(x + e) + g
      const a = randNonZero(rng, -7, 7), b = randNonZero(rng, -7, 7);
      const c = randNonZero(rng, -7, 7), e = randNonZero(rng, -7, 7);
      if (a + b === c + e) continue;
      const g = (a + b - c - e) * x + a * b - c * e;
      if (g === 0) continue;
      latex = `${prod(a, b)} = ${prod(c, e)}${plus(String(g))}`;
      expanded = `${linExpr([[1, 'x^2'], [a + b, 'x'], [a * b, '']])} = ${linExpr([[1, 'x^2'], [c + e, 'x'], [c * e + g, '']])}`;
      f = { A: a + b, B: a * b, C: c + e, D: c * e + g };
      expands.push([[1, a], [1, b]], [[1, c], [1, e]]);
    } else if (d === 3) {
      // (x + a)² − (x + b)² = c
      const a = randNonZero(rng, -8, 8), b = randNonZero(rng, -8, 8, [a, -a]);
      const c = 2 * (a - b) * x + a * a - b * b;
      latex = `${sq(1, a)} - ${sq(1, b)} = ${c}`;
      expanded = `${linExpr([[1, 'x^2'], [2 * a, 'x'], [a * a, '']])} - (${linExpr([[1, 'x^2'], [2 * b, 'x'], [b * b, '']])}) = ${c}`;
      f = { A: 2 * (a - b), B: a * a - b * b, C: 0, D: c };
      expands.push([[1, a], [1, a]], [[1, b], [1, b]]);
      // −(x + b)² written as −x² + 2bx + b²: only the first term's sign changed.
      if (a + b !== 0) extra.push(['minus-bracket', () => div(c - a * a - b * b, 2 * (a + b))]);
    } else {
      // d4: (x + a)² − (x + b)(x − b) = kx + c     d5: the same with p·x inside, answer may be a fraction.
      const p = d === 4 ? 1 : randInt(rng, 2, 3);
      const a = randNonZero(rng, -7, 7), b = randInt(rng, 1, 7);
      const k = randNonZero(rng, -9, 9, [2 * p * a]);
      let c: number;
      if (d === 4) {
        c = (2 * a - k) * x + a * a + b * b;
      } else {
        c = randNonZero(rng, -30, 30);
        const s = div(c - a * a - b * b, 2 * p * a - k);
        if (s.n === 0 || s.d > 6 || Math.abs(toNumber(s)) > 15) continue;
      }
      latex = `${sq(p, a)} - (${linExpr([[p, 'x'], [b, '']])})(${linExpr([[p, 'x'], [-b, '']])}) = ${linExpr([[k, 'x'], [c, '']])}`;
      expanded = `${linExpr([[p * p, 'x^2'], [2 * p * a, 'x'], [a * a, '']])} - (${linExpr([[p * p, 'x^2'], [-b * b, '']])}) = ${linExpr([[k, 'x'], [c, '']])}`;
      f = { A: 2 * p * a, B: a * a + b * b, C: k, D: c };
      expands.push([[p, a], [p, a]], [[p, b], [p, -b]]);
      extra.push(['diff-squares-sign', () => div(c - a * a + b * b, 2 * p * a - k)]);
      if (Math.abs(c) > 200) continue;
    }

    if (Math.max(...(latex.match(/\d+/g) ?? []).map(Number)) > 200) continue;
    const sol = div(f.D - f.B, f.A - f.C);
    const answer = toNumber(sol);
    const k = f.A - f.C;
    const steps = [...expands.map(([u, v]) => expandStep(rng, u, v)), ...linearHelpSteps(rng, f, answer)];
    return makeQuestion('eq.shortMult', d, {
      prompt: SOLVE_X,
      latex,
      answer: sol,
      solution: [
        m(latex),
        `פותחים לפי נוסחאות הכפל המקוצר: ${m(expanded)}`,
        `${m('x^2')} מצטמצם משני הצדדים, ונשארת משוואה ממעלה ראשונה: ${m(`${linExpr([[k, 'x']])} = ${f.D - f.B}`)}`,
        m(`x = ${qLatex(sol)}`),
      ],
      steps,
      distractors: linearDistractors(f, answer, extra),
    });
  }
}

// ---------- eq.rational: x in the denominator ----------

export function rationalQuestion(d: Difficulty, rng: Rng): Question {
  for (;;) {
    const x = randNonZero(rng, -8, 9);

    if (d <= 2) {
      // A/(x + p) + B = C/(x + p)
      const p = randNonZero(rng, -7, 7);
      const u = x + p;
      if (u === 0) continue;
      const A = randNonZero(rng, -9, 9);
      const B = d === 1 ? randInt(rng, 1, 3) : randNonZero(rng, -4, 4);
      const C = A + B * u;
      if (C === 0 || Math.abs(C) > 60) continue;
      const latex = `${frac(A, xPlus(p))}${plus(String(B))} = ${frac(C, xPlus(p))}`;
      const f: Linear = { A: B, B: A + B * p, C: 0, D: C, products: [[B, p]] };
      const steps = [
        domainStep(rng, [-p], [x]),
        helpStep(
          'clear-denominator',
          'כפל במכנה',
          [
            `מה יקרה אם נכפול את כל המשוואה ב-${m(`(${xPlus(p)})`)}?`,
            `כופלים כל איבר במכנה — גם את המספר ${m(String(B))} שאין לו מכנה.`,
            `דוגמה: ${m(`${frac(3, 'x - 1')} + 2 = ${frac(7, 'x - 1')}`)} הופך ל-${m('3 + 2(x - 1) = 7')}.`,
          ],
          { latex: `${A} + ${paren(B)}(${xPlus(p)}) = \\square`, answer: C },
          [`מה נשאר מ-${m(frac(A, xPlus(p)))} אחרי הכפל?`, `ומה קורה ל-${m(String(B))} כשכופלים אותו ב-${m(`(${xPlus(p)})`)}?`],
          { 'clear-partial': `את ${m(String(B))} כופלים בכל הסוגריים ${m(`(${xPlus(p)})`)}, לא רק ב-${m('x')}.` },
        ),
        ...linearHelpSteps(rng, f, x),
      ];
      return makeQuestion('eq.rational', d, {
        prompt: SOLVE_X,
        latex,
        answer: x,
        solution: [
          m(latex),
          `תחום הצבה: ${m(`x \\neq ${-p}`)}`,
          `כופלים ב-${m(`(${xPlus(p)})`)}: ${m(`${A} + ${paren(B)}(${xPlus(p)}) = ${C}`)}`,
          m(`${linExpr([[B, 'x']])} = ${C - A - B * p}`),
          `${m(`x = ${x}`)} — בתחום ההצבה ✓`,
        ],
        steps,
        distractors: linearDistractors(f, x, [
          ['clear-partial', () => div(C - A, B)],
          ['domain', () => -p],
        ]),
      });
    }

    if (d === 3) {
      // (x + a)/(x + p) = (x + b)/(x + q): both sides equal t, so x² cancels after cross-multiplying.
      const u = randNonZero(rng, -6, 6), v = randNonZero(rng, -6, 6, [u]);
      const t = randSigned(rng, 2, 3);
      const a = t * u - x, b = t * v - x, p = u - x, q = v - x;
      if (Math.max(Math.abs(a), Math.abs(b), Math.abs(p), Math.abs(q)) > 20) continue;
      const latex = `${frac(xPlus(a), xPlus(p))} = ${frac(xPlus(b), xPlus(q))}`;
      const f: Linear = { A: a + q, B: a * q, C: b + p, D: b * p };
      const k = f.A - f.C;
      const steps = [
        domainStep(rng, [-p, -q], [x]),
        helpStep(
          'cross-multiply',
          'כפל בהצלבה',
          [
            'שבר שווה לשבר. איך נפטרים משני המכנים בבת אחת?',
            'כפל בהצלבה: המונה של כל שבר כפול המכנה של השבר השני.',
            `דוגמה: ${m(`${frac('x + 1', 'x - 2')} = ${frac('x + 3', 'x + 5')}`)} הופך ל-${m('(x + 1)(x + 5) = (x + 3)(x - 2)')}.`,
          ],
          { latex: `(${xPlus(a)})(${xPlus(q)}) = (${xPlus(b)})(x + \\square)`, answer: p },
          ['מה המונה של השבר השמאלי, ומה המכנה של הימני?', 'ומה המונה של הימני כפול המכנה של השמאלי?'],
        ),
        expandStep(rng, [1, a], [1, q]),
        expandStep(rng, [1, b], [1, p]),
        ...linearHelpSteps(rng, f, x),
      ];
      return makeQuestion('eq.rational', d, {
        prompt: SOLVE_X,
        latex,
        answer: x,
        solution: [
          m(latex),
          `תחום הצבה: ${m(`x \\neq ${-p},\\; x \\neq ${-q}`)}`,
          `כפל בהצלבה: ${m(`(${xPlus(a)})(${xPlus(q)}) = (${xPlus(b)})(${xPlus(p)})`)}`,
          `פותחים, ו-${m('x^2')} מצטמצם: ${m(`${linExpr([[f.A, 'x'], [f.B, '']])} = ${linExpr([[f.C, 'x'], [f.D, '']])}`)}`,
          m(`${linExpr([[k, 'x']])} = ${f.D - f.B}`),
          `${m(`x = ${x}`)} — בתחום ההצבה ✓`,
        ],
        steps,
        distractors: linearDistractors(f, x, [['domain', () => -p]]),
      });
    }

    // d4: a/(x − p) + b/(x + p) = c/(x² − p²)     d5: numerator k·x + c on the right
    const p = randInt(rng, 1, 6);
    if (Math.abs(x) === p) continue;
    const a = randNonZero(rng, -6, 6), b = randNonZero(rng, -6, 6, [-a]);
    const k = d === 4 ? 0 : randNonZero(rng, -6, 6, [a + b]);
    const c = (a + b - k) * x + a * p - b * p;
    if (c === 0 || Math.abs(c) > 99) continue;
    const den = `x^2 - ${p * p}`;
    const latex = `${frac(a, xPlus(-p))} + ${frac(b, xPlus(p))} = ${frac(linExpr([[k, 'x'], [c, '']]), den)}`;
    const f: Linear = { A: a + b, B: a * p - b * p, C: k, D: c };
    const steps = [
      expandStep(rng, [1, -p], [1, p]),
      domainStep(rng, [p, -p], [x]),
      helpStep(
        'clear-denominator',
        'כפל במכנה המשותף',
        [
          `מה המכנה המשותף לשלושת השברים?`,
          `${m(`${den} = (${xPlus(-p)})(${xPlus(p)})`)}, לכן זה המכנה המשותף. כופלים בו כל איבר — מכל שבר נשאר המונה כפול הגורם שחסר לו.`,
          `דוגמה: ${m(`${frac(2, 'x - 1')} + ${frac(3, 'x + 1')} = ${frac(9, 'x^2 - 1')}`)} הופך ל-${m('2(x + 1) + 3(x - 1) = 9')}.`,
        ],
        { latex: `\\square(${xPlus(p)}) + ${b}(${xPlus(-p)}) = ${linExpr([[k, 'x'], [c, '']])}`, answer: a },
        [`בשבר ${m(frac(a, xPlus(-p)))} חסר במכנה הגורם ${m(`(${xPlus(p)})`)}. במה מכפילים את המונה?`, `ובשבר ${m(frac(b, xPlus(p)))} — איזה גורם חסר?`],
        { 'clear-swap': `בדקי: כל מונה מוכפל בגורם שחסר במכנה שלו, לא בגורם שכבר יש לו.` },
      ),
      ...linearHelpSteps(rng, f, x),
    ];
    return makeQuestion('eq.rational', d, {
      prompt: SOLVE_X,
      latex,
      answer: x,
      solution: [
        m(latex),
        `מפרקים את המכנה: ${m(`${den} = (${xPlus(-p)})(${xPlus(p)})`)}`,
        `תחום הצבה: ${m(`x \\neq ${p},\\; x \\neq ${-p}`)}`,
        `כופלים במכנה המשותף: ${m(`${a}(${xPlus(p)}) + ${paren(b)}(${xPlus(-p)}) = ${linExpr([[k, 'x'], [c, '']])}`)}`,
        m(`${linExpr([[f.A - f.C, 'x']])} = ${f.D - f.B}`),
        `${m(`x = ${x}`)} — בתחום ההצבה ✓`,
      ],
      steps,
      distractors: linearDistractors(f, x, [
        ['clear-swap', () => div(c + a * p - b * p, a + b - k)],
        ['domain', () => p],
      ]),
    });
  }
}

// ---------- eq.param: equations with a parameter m ----------

const PARAM = m('m');

function exampleAvoiding(rng: Rng, avoid: number): number {
  const e = randInt(rng, 2, 7);
  return e === avoid ? e + 1 : e;
}

export function paramQuestion(d: Difficulty, rng: Rng): Question {
  for (;;) {
    const m0 = randNonZero(rng, -9, 9);

    if (d <= 2) {
      // d1: m·x + b = c·x + e     d2: m(x + a) = c·x + e — and x = s is a solution.
      const s = randNonZero(rng, -6, 6, [1]);
      const a = d === 1 ? 0 : randNonZero(rng, -6, 6, [-s]);
      const b = d === 1 ? randNonZero(rng, -9, 9) : 0;
      const c = randNonZero(rng, -6, 6, [m0]);
      const e = m0 * (s + a) + b - c * s;
      if (Math.abs(e) > 99) continue;
      const left = d === 1 ? linExpr([[1, 'm x'], [b, '']]) : `m(${xPlus(a)})`;
      const latex = `${left} = ${linExpr([[c, 'x'], [e, '']])}`;
      const coef = s + a;
      const rhs = c * s + e - b;
      const ex = exampleAvoiding(rng, m0);
      const steps = [
        helpStep(
          'parameter',
          'הצבת הפתרון',
          [
            `מה זה אומר ש-${m(`x = ${s}`)} הוא פתרון של המשוואה?`,
            `פתרון הוא מספר שמקיים את המשוואה. מציבים אותו במקום ${m('x')}, ומקבלים משוואה שבה הנעלם הוא ${PARAM}.`,
            `דוגמה: אם ${m('x = 2')} פתרון של ${m(`m x + 1 = ${2 * ex + 1}`)}, מציבים: ${m(`2m + 1 = ${2 * ex + 1}`)}.`,
          ],
          { latex: `${linExpr([[coef, 'm'], [b, '']])} = \\square`, answer: c * s + e },
          [`הציבי ${m(String(s))} במקום ${m('x')} בצד ימין: כמה זה ${m(`${c} \\cdot ${paren(s)} ${e < 0 ? '-' : '+'} ${Math.abs(e)}`)}?`, `ובצד שמאל — מה המקדם של ${PARAM}?`],
        ),
        helpStep(
          'divide-coefficient',
          `בידוד ${PARAM}`,
          [
            `עכשיו זו משוואה רגילה עם ${PARAM}. מה עוד צריך לעשות כדי לבודד אותו?`,
            `פותרים בדיוק כמו משוואה עם ${m('x')}: מעבירים אגפים ומחלקים במקדם.`,
            `דוגמה: ${m(`3m + 1 = ${3 * ex + 1}`)} → ${m(`3m = ${3 * ex}`)} → מחלקים ב-${m('3')}.`,
          ],
          { latex: `${linExpr([[coef, 'm']])} = \\square`, answer: rhs },
          [`העבירי את המספר לצד ימין.`, `במה צריך לחלק?`],
          { 'divide-wrong': `${PARAM} מוכפל ב-${m(String(coef))}, אז צריך לחלק.` },
        ),
      ];
      return makeQuestion('eq.param', d, {
        prompt: `ידוע ש-${m(`x = ${s}`)} הוא פתרון של המשוואה. מצאי את הפרמטר ${PARAM}.`,
        latex,
        answer: m0,
        unknown: 'm',
        pathTitle: 'הצבה ופתרון',
        solution: [
          m(latex),
          `מציבים ${m(`x = ${s}`)}: ${m(`${linExpr([[coef, 'm'], [b, '']])} = ${c * s + e}`)}`,
          m(`${linExpr([[coef, 'm']])} = ${rhs}`),
          m(`m = ${m0}`),
        ],
        steps,
        distractors: numericDistractors(m0, [
          ['sign-move', b !== 0 ? () => div(c * s + e + b, coef) : null],
          ['param-no-sub', () => c],
          ['divide-wrong', coef !== 1 ? () => rhs * coef : null],
          ['divide-sign', () => -m0],
        ]),
      });
    }

    if (d === 3) {
      // m(x + a) = c(x + b) + e·x + g has no solution when m = c + e (and the constants differ).
      const a = randNonZero(rng, -5, 5), b = randNonZero(rng, -6, 6);
      const c = randInt(rng, 2, 5), e = randNonZero(rng, -4, 4);
      const K = c + e;
      const g = randInt(rng, -9, 9);
      const leftover = c * b + g - K * a;
      if (K === 0 || leftover === 0) continue;
      const latex = `m(${xPlus(a)}) = ${scaled(c, xPlus(b))}${plus(linExpr([[e, 'x'], [g, '']]))}`;
      const ex = exampleAvoiding(rng, K);
      const steps = [
        helpStep(
          'combine-like-terms',
          'כינוס לצורה ax = b',
          [
            `איך מביאים את המשוואה לצורה ${m('(\\dots)x = \\dots')}?`,
            `פותחים סוגריים, מעבירים את כל האיברים עם ${m('x')} לשמאל ואת השאר לימין, ומוציאים ${m('x')} כגורם משותף.`,
            `דוגמה: ${m('m x + 2 = 3x + m')} → ${m('m x - 3x = m - 2')} → ${m('(m - 3)x = m - 2')}.`,
          ],
          { latex: `(m + \\square)x = ${linExpr([[c * b + g, ''], [-a, 'm']])}`, answer: -K },
          [`פתחי את הסוגריים בשני הצדדים.`, `כמה ${m('x')}-ים יש בצד ימין בסך הכול? העבירי אותם לשמאל.`],
        ),
        helpStep(
          'parameter',
          'מתי אין פתרון',
          [
            `מתי למשוואה מהצורה ${m('(\\dots)x = \\dots')} אין פתרון?`,
            `כשהמקדם של ${m('x')} הוא ${m('0')} והצד השני אינו ${m('0')}: מקבלים ${m('0 = 5')}, וזה שקר. אם גם הצד השני ${m('0')} — יש אינסוף פתרונות.`,
            `דוגמה: ב-${m(`(m - ${ex})x = m + 1`)}, כש-${m(`m = ${ex}`)} מתקבל ${m(`0 \\cdot x = ${ex + 1}`)} — אין פתרון.`,
          ],
          { latex: `0 \\cdot x = \\square`, answer: leftover },
          [`לאיזה ${PARAM} המקדם של ${m('x')} מתאפס?`, `הציבי את הערך הזה בצד ימין. יצא ${m('0')} או מספר אחר?`],
          { 'param-coef-part': `בדקי שאספת את כל האיברים עם ${m('x')} — גם את ${m(linExpr([[e, 'x']]))}.` },
        ),
      ];
      return makeQuestion('eq.param', d, {
        prompt: `לאיזה ערך של הפרמטר ${PARAM} אין למשוואה פתרון?`,
        latex,
        answer: K,
        unknown: 'm',
        pathTitle: 'מקדם x מתאפס',
        solution: [
          m(latex),
          `פותחים ומכנסים: ${m(`(m - ${paren(K)})x = ${linExpr([[c * b + g, ''], [-a, 'm']])}`)}`,
          `אין פתרון כשהמקדם של ${m('x')} מתאפס: ${m(`m = ${K}`)}`,
          `בדיקה: אז הצד הימני הוא ${m(String(leftover))} ולא ${m('0')}, כלומר ${m(`0 = ${leftover}`)} — אין פתרון ✓`,
        ],
        steps,
        distractors: numericDistractors(K, [
          ['param-coef-part', () => c],
          ['param-sign', () => -K],
        ]),
      });
    }

    if (d === 4) {
      // (m − a)(m + b)·x = m − a: m = a gives infinitely many solutions, m = −b gives none.
      const a = randNonZero(rng, -6, 6), b = randNonZero(rng, -6, 6, [-a]);
      const askNone = rng() < 0.6;
      const answer = askNone ? -b : a;
      const other = askNone ? a : -b;
      const latex = `(${linExpr([[1, 'm'], [-a, '']])})(${linExpr([[1, 'm'], [b, '']])})x = ${linExpr([[1, 'm'], [-a, '']])}`;
      const ex = exampleAvoiding(rng, answer);
      const ex2 = exampleAvoiding(rng, -answer);
      const steps = [
        helpStep(
          'parameter',
          'איפוס המקדם',
          [
            `למה כדאי לבדוק מתי המקדם של ${m('x')} שווה ${m('0')}?`,
            `רק כשהמקדם של ${m('x')} הוא ${m('0')} יכול להיות שאין פתרון או שיש אינסוף. מכפלה היא ${m('0')} כשאחד הגורמים ${m('0')}.`,
            `דוגמה: ${m(`(m - ${ex})(m + ${ex2}) = 0`)} כש-${m(`m = ${ex}`)} או ${m(`m = ${-ex2}`)}.`,
          ],
          { latex: `m = ${other},\\quad m = \\square`, answer },
          [`מתי ${m(linExpr([[1, 'm'], [-a, '']]))} שווה ${m('0')}?`, `ומתי ${m(linExpr([[1, 'm'], [b, '']]))} שווה ${m('0')}?`],
        ),
        helpStep(
          'parameter',
          'בדיקת כל ערך',
          [
            `לכל אחד מהערכים — מה יוצא בצד ימין?`,
            `${m('0 \\cdot x = 0')} — כל ${m('x')} פתרון (אינסוף). ${m('0 \\cdot x = 5')} — אין אף פתרון.`,
            `דוגמה: ב-${m(`(m - ${ex})x = m - ${ex}`)} עם ${m(`m = ${ex}`)} יוצא ${m('0 \\cdot x = 0')}: אינסוף פתרונות.`,
          ],
          { latex: `m = ${other}:\\quad 0 \\cdot x = \\square`, answer: other - a },
          [`הציבי כל ערך ב-${m(linExpr([[1, 'm'], [-a, '']]))}.`],
          {
            'param-infinite': `בערך הזה יוצא ${m('0 \\cdot x = 0')} — זה אינסוף פתרונות, לא "אין פתרון".`,
            'param-none': `בערך הזה יוצא ${m('0 \\cdot x')} שווה מספר שאינו ${m('0')} — זה "אין פתרון".`,
          },
        ),
      ];
      return makeQuestion('eq.param', d, {
        prompt: askNone ? `לאיזה ערך של ${PARAM} אין למשוואה אף פתרון?` : `לאיזה ערך של ${PARAM} יש למשוואה אינסוף פתרונות?`,
        latex,
        answer,
        unknown: 'm',
        pathTitle: 'בדיקת המקדם',
        solution: [
          m(latex),
          `המקדם של ${m('x')} מתאפס כש-${m(`m = ${a}`)} או ${m(`m = ${-b}`)}.`,
          `${m(`m = ${a}`)}: ${m('0 \\cdot x = 0')} — אינסוף פתרונות.`,
          `${m(`m = ${-b}`)}: ${m(`0 \\cdot x = ${-b - a}`)} — אין פתרון.`,
          `התשובה: ${m(`m = ${answer}`)}`,
        ],
        steps,
        distractors: numericDistractors(answer, [
          [askNone ? 'param-infinite' : 'param-none', () => other],
          ['param-sign', () => -answer],
        ]),
      });
    }

    // d5: { a1·x + m·y = c1 ; t·a1·x + t·m0·y = c2 } with c2 ≠ t·c1 has no solution at m = m0.
    const a1 = randNonZero(rng, -4, 4);
    const t = randSigned(rng, 2, 3);
    const mm = randNonZero(rng, -4, 4);
    const c1 = randInt(rng, -9, 9);
    const c2 = t * c1 + randNonZero(rng, -5, 5);
    const a2 = t * a1, b2 = t * mm;
    const latex = `\\begin{cases} ${linExpr([[a1, 'x'], [1, 'm y']])} = ${c1} \\\\ ${linExpr([[a2, 'x'], [b2, 'y']])} = ${c2} \\end{cases}`;
    const steps = [
      helpStep(
        'parameter',
        'יחס המקדמים',
        [
          `מתי לשני ישרים אין אף נקודה משותפת?`,
          `למערכת אין פתרון כשהמקדמים של ${m('x')} ושל ${m('y')} באותו יחס (ישרים מקבילים), אבל המספרים בצד ימין לא באותו יחס.`,
          `דוגמה: ב-${m('x + 2y = 1')} ו-${m('3x + 6y = 5')} כל המקדמים כפול ${m('3')}, אבל ${m('5 \\neq 3')} — אין פתרון.`,
        ],
        { latex: `${a2} : ${paren(a1)} = \\square`, answer: t },
        [`פי כמה המקדם של ${m('x')} במשוואה השנייה גדול מבראשונה?`],
      ),
      helpStep(
        'parameter',
        'השוואת היחס',
        [
          `גם המקדם של ${m('y')} צריך להיות באותו יחס. איזו משוואה זה נותן ל-${PARAM}?`,
          `אם המשוואה השנייה היא פי ${m(String(t))} מהראשונה בצד שמאל, אז ${m(String(b2))} חייב להיות ${m(`${t} \\cdot m`)}.`,
          `דוגמה: אם היחס הוא ${m('2')} והמקדם השני של ${m('y')} הוא ${m('8')}, אז ${m('2 \\cdot m = 8')}.`,
        ],
        { latex: `${t} \\cdot m = \\square`, answer: b2 },
        [`כתבי: (מקדם ${m('y')} בשנייה) = (יחס) · (מקדם ${m('y')} בראשונה).`, `בדקי בסוף שהיחס של הצד הימני שונה.`],
        { 'param-ratio-inverse': `בדקי את כיוון היחס: מחלקים את המקדם של השנייה ביחס, לא כופלים.` },
      ),
    ];
    return makeQuestion('eq.param', d, {
      prompt: `לאיזה ערך של ${PARAM} אין למערכת פתרון?`,
      latex,
      answer: mm,
      unknown: 'm',
      pathTitle: 'ישרים מקבילים',
      solution: [
        m(latex),
        `המקדמים של ${m('x')}: ${m(`${a2} = ${t} \\cdot ${paren(a1)}`)} — יחס ${m(String(t))}.`,
        `כדי שגם ל-${m('y')} יהיה אותו יחס: ${m(`${t}m = ${b2}`)}, ולכן ${m(`m = ${mm}`)}.`,
        `בצד ימין: ${m(`${t} \\cdot ${paren(c1)} = ${t * c1} \\neq ${c2}`)} — הישרים מקבילים ולא מתלכדים, אין פתרון ✓`,
      ],
      steps,
      distractors: numericDistractors(mm, [
        ['param-ratio-inverse', () => b2 * t],
        ['param-sign', () => -mm],
      ]),
    });
  }
}

// ---------- eq.word: word problems ----------

function modelStep(hint0: string, example: string, blank: { latex: string; answer: number }, subSteps: string[]): HelpStep {
  return helpStep(
    'word-model',
    'בניית המשוואה',
    [hint0, `מסמנים את מה ששואלים ב-${m('x')}, מבטאים בעזרתו כל כמות בשאלה, ומחפשים שני ביטויים שאמורים להיות שווים.`, example],
    blank,
    subSteps,
    { 'word-wrong-unknown': `בדקי מה בדיוק שואלים — מצאת כמות אחרת מהבעיה.` },
  );
}

export function wordQuestion(d: Difficulty, rng: Rng): Question {
  for (;;) {
    if (d === 1) {
      // Consecutive (even/odd) numbers: n·x + step·n(n−1)/2 = S.
      const n = pick(rng, [3, 4]);
      const step = pick(rng, [1, 2]);
      const kind = step === 1 ? 'עוקבים' : pick(rng, ['זוגיים עוקבים', 'אי-זוגיים עוקבים']);
      let x = randInt(rng, 5, 40);
      if (kind === 'זוגיים עוקבים' && x % 2) x++;
      if (kind === 'אי-זוגיים עוקבים' && x % 2 === 0) x++;
      const B = (step * n * (n - 1)) / 2;
      const S = n * x + B;
      const terms = Array.from({ length: n }, (_, i) => (i === 0 ? 'x' : `(${xPlus(i * step)})`));
      const blankTerms = [...terms.slice(0, -1), `(x + \\square)`];
      const f: Linear = { A: n, B, C: 0, D: S };
      return makeQuestion('eq.word', d, {
        prompt: `סכום של ${n === 3 ? 'שלושה' : 'ארבעה'} מספרים ${kind} הוא ${m(String(S))}. מהו המספר הקטן מביניהם?`,
        answer: x,
        solution: [
          `נסמן את המספר הקטן ב-${m('x')}. המספרים: ${m(terms.join(',\\ '))}`,
          m(`${terms.join(' + ')} = ${S}`),
          m(`${n}x + ${B} = ${S}`),
          `${m(`x = ${x}`)}: המספר הקטן הוא ${m(String(x))}`,
        ],
        steps: [
          modelStep(
            `אם המספר הקטן הוא ${m('x')}, איך נכתוב את הבאים אחריו?`,
            `דוגמה: שני מספרים עוקבים שסכומם ${m('15')}: ${m('x + (x + 1) = 15')}.`,
            { latex: `${blankTerms.join(' + ')} = ${S}`, answer: (n - 1) * step },
            [`בכמה גדול כל מספר מהקודם לו?`, `אז בכמה גדול המספר האחרון מ-${m('x')}?`],
          ),
          ...linearHelpSteps(rng, f, x),
        ],
        distractors: linearDistractors(f, x, [
          ['word-wrong-unknown', () => x + (n - 1) * step],
          ['word-average', () => div(S, n)],
        ]),
      });
    }

    if (d === 2) {
      // Ages: mother is k times as old; in n years she will be j times as old: kx + n = j(x + n).
      const j = pick(rng, [2, 3]);
      const t = randInt(rng, 1, 3);
      const k = j + t;
      const s = randInt(rng, 1, 15);
      const x = s * (j - 1), n = t * s;
      if ((k - 1) * x < 18 || k * x > 60) continue;
      const f: Linear = { A: k, B: n, C: j, D: j * n, products: [[j, n]] };
      return makeQuestion('eq.word', d, {
        prompt: `אמא מבוגרת פי ${k} מבתה. בעוד ${n} שנים היא תהיה מבוגרת ממנה פי ${j}. בת כמה הבת היום?`,
        answer: x,
        solution: [
          `נסמן את גיל הבת היום ב-${m('x')}. גיל האם: ${m(`${k}x`)}.`,
          `בעוד ${n} שנים: הבת ${m(xPlus(n))}, האם ${m(`${k}x + ${n}`)}.`,
          m(`${k}x + ${n} = ${j}(${xPlus(n)})`),
          m(`${linExpr([[k - j, 'x']])} = ${j * n - n}`),
          `${m(`x = ${x}`)}: הבת בת ${x}`,
        ],
        steps: [
          modelStep(
            `אם גיל הבת היום הוא ${m('x')}, מה גיל האם? ומה יהיו הגילים בעוד ${n} שנים?`,
            `דוגמה: אבא מבוגר פי ${m('4')} מבנו, ובעוד ${m('5')} שנים פי ${m('3')}: ${m('4x + 5 = 3(x + 5)')}.`,
            { latex: `\\square\\, x + ${n} = ${j}(${xPlus(n)})`, answer: k },
            [`פי כמה האם מבוגרת היום? כתבי את גילה בעזרת ${m('x')}.`, `בעוד ${n} שנים — מוסיפים ${n} לשתיהן.`],
          ),
          ...linearHelpSteps(rng, f, x),
        ],
        distractors: linearDistractors(f, x, [
          ['word-wrong-unknown', () => k * x],
          ['word-future', () => x + n],
        ]),
      });
    }

    if (d === 3) {
      if (rng() < 0.5) {
        // Meeting: A leaves first at v1; h hours later B leaves the other city at v2.
        const v1 = pick(rng, [40, 50, 60, 70, 80, 90]), v2 = pick(rng, [40, 50, 60, 70, 80, 90]);
        const x = randInt(rng, 2, 6), h = randInt(rng, 1, x - 1);
        const D = v1 * x + v2 * (x - h);
        const f: Linear = { A: v1 + v2, B: -v2 * h, C: 0, D, products: [[v2, -h]] };
        return makeQuestion('eq.word', d, {
          prompt: `המרחק בין שתי ערים הוא ${D} ק"מ. מכונית א' יצאה מהעיר הראשונה במהירות ${v1} קמ"ש. כעבור ${h} ${h === 1 ? 'שעה' : 'שעות'} יצאה מכונית ב' מהעיר השנייה לקראתה במהירות ${v2} קמ"ש. כמה שעות אחרי יציאת מכונית א' הן נפגשו?`,
          answer: x,
          solution: [
            `נסמן ב-${m('x')} את זמן הנסיעה של מכונית א'. מכונית ב' נסעה ${m(xPlus(-h))} שעות.`,
            `יחד הן עברו את כל המרחק: ${m(`${v1}x + ${v2}(${xPlus(-h)}) = ${D}`)}`,
            m(`${v1 + v2}x = ${D + v2 * h}`),
            `${m(`x = ${x}`)}: נפגשו ${x} שעות אחרי יציאת מכונית א'`,
          ],
          steps: [
            modelStep(
              `אם מכונית א' נסעה ${m('x')} שעות, כמה זמן נסעה מכונית ב'? וכמה ק"מ עברה כל אחת?`,
              `דוגמה: מרחק ${m('300')}, מהירויות ${m('60')} ו-${m('40')}, השנייה יצאה שעה אחרי: ${m('60x + 40(x - 1) = 300')}.`,
              { latex: `${v1}x + ${v2}(x - \\square) = ${D}`, answer: h },
              [`דרך = מהירות × זמן.`, `מכונית ב' יצאה מאוחר יותר — אז היא נסעה פחות זמן.`],
            ),
            ...linearHelpSteps(rng, f, x),
          ],
          distractors: linearDistractors(f, x, [
            ['word-wrong-unknown', () => x - h],
            ['word-no-delay', () => div(D, v1 + v2)],
          ]),
        });
      }
      // Catch-up: A leaves at v1; h hours later B follows at v2 > v1. How long until B catches up?
      const v1 = pick(rng, [40, 50, 60, 80]);
      const x = randInt(rng, 1, 5), h = randInt(rng, 1, 3);
      if ((v1 * h) % x) continue;
      const v2 = v1 + (v1 * h) / x;
      if (v2 > 150 || v2 % 5) continue;
      const f: Linear = { A: v1, B: v1 * h, C: v2, D: 0, products: [[v1, h]] };
      return makeQuestion('eq.word', d, {
        prompt: `רוכב אופנוע יצא לדרך במהירות ${v1} קמ"ש. כעבור ${h} ${h === 1 ? 'שעה' : 'שעות'} יצאה אחריו מכונית מאותה נקודה, באותו כיוון, במהירות ${v2} קמ"ש. כמה שעות אחרי שיצאה המכונית היא תשיג אותו?`,
        answer: x,
        solution: [
          `נסמן ב-${m('x')} את זמן הנסיעה של המכונית. הרוכב נסע ${m(xPlus(h))} שעות.`,
          `בנקודת ההשגה שניהם עברו אותה דרך: ${m(`${v1}(${xPlus(h)}) = ${v2}x`)}`,
          m(`${v1 * h} = ${v2 - v1}x`),
          `${m(`x = ${x}`)}: המכונית תשיג אותו אחרי ${x} ${x === 1 ? 'שעה' : 'שעות'}`,
        ],
        steps: [
          modelStep(
            `מה שווה בין הרוכב למכונית ברגע שהיא משיגה אותו?`,
            `דוגמה: הולך במהירות ${m('5')} יצא שעתיים לפני רוכב במהירות ${m('15')}: ${m('5(x + 2) = 15x')}.`,
            { latex: `${v1}(x + \\square) = ${v2}x`, answer: h },
            [`הרוכב יצא קודם — כמה זמן הוא נסע, בעזרת ${m('x')}?`, `דרך = מהירות × זמן, ושתי הדרכים שוות.`],
          ),
          ...linearHelpSteps(rng, f, x),
        ],
        distractors: linearDistractors(f, x, [
          ['word-wrong-unknown', () => x + h],
          ['word-speed-sum', () => div(v1 * h, v1 + v2)],
        ]),
      });
    }

    if (d === 4) {
      // Rectangle: width x, length x + a. Width +b, length −c → area grows by Δ (x² cancels).
      const x = randInt(rng, 3, 15), a = randInt(rng, 2, 8);
      const b = randInt(rng, 2, 5), c = randInt(rng, 1, b - 1);
      if (a - c < 1) continue;
      const delta = (b - c) * x + b * (a - c);
      const f: Linear = { A: a - c + b, B: b * (a - c), C: a, D: delta };
      return makeQuestion('eq.word', d, {
        prompt: `האורך של מלבן גדול ב-${a} ס"מ מהרוחב שלו. אם נגדיל את הרוחב ב-${b} ס"מ ונקטין את האורך ב-${c} ס"מ, השטח יגדל ב-${delta} סמ"ר. מה הרוחב של המלבן?`,
        answer: x,
        pathTitle: 'משוואה עם כפל סוגריים',
        solution: [
          `נסמן את הרוחב ב-${m('x')}. האורך: ${m(xPlus(a))}. השטח: ${m(`x(${xPlus(a)})`)}`,
          `אחרי השינוי: ${m(`(${xPlus(b)})(${xPlus(a - c)}) = x(${xPlus(a)}) + ${delta}`)}`,
          `פותחים, ו-${m('x^2')} מצטמצם: ${m(`${linExpr([[f.A, 'x'], [f.B, '']])} = ${linExpr([[a, 'x'], [delta, '']])}`)}`,
          `${m(`x = ${x}`)}: הרוחב ${x} ס"מ`,
        ],
        steps: [
          modelStep(
            `אם הרוחב הוא ${m('x')}, מה האורך? ומה יהיו הרוחב והאורך אחרי השינוי?`,
            `דוגמה: אורך גדול ב-${m('3')} מהרוחב; מגדילים את שניהם ב-${m('1')} והשטח גדל ב-${m('10')}: ${m('(x + 1)(x + 4) = x(x + 3) + 10')}.`,
            { latex: `(x + \\square)(${xPlus(a - c)}) = x(${xPlus(a)}) + ${delta}`, answer: b },
            [`הרוחב החדש: ${m('x')} ועוד כמה?`, `האורך החדש: ${m(xPlus(a))} פחות ${m(String(c))}.`],
          ),
          expandStep(rng, [1, b], [1, a - c]),
          ...linearHelpSteps(rng, f, x),
        ],
        distractors: linearDistractors(f, x, [
          ['word-wrong-unknown', () => x + a],
          ['word-new-width', () => x + b],
        ]),
      });
    }

    // d5: rational models — pipes working together, or a round trip at two speeds.
    if (rng() < 0.5) {
      const [a, t, x] = pick(rng, [[6, 4, 12], [10, 6, 15], [12, 8, 24], [15, 10, 30], [20, 12, 30], [6, 3, 6], [12, 4, 6], [8, 6, 24], [9, 6, 18], [12, 9, 36], [4, 3, 12], [14, 10, 35]] as const);
      const f: Linear = { A: t, B: a * t, C: a, D: 0 };
      return makeQuestion('eq.word', d, {
        prompt: `ברז א' ממלא בריכה לבדו ב-${a} שעות. שני הברזים יחד ממלאים אותה ב-${t} שעות. בכמה שעות ממלא ברז ב' את הבריכה לבדו?`,
        answer: x,
        pathTitle: 'הספק',
        solution: [
          `נסמן ב-${m('x')} את הזמן של ברז ב'. בשעה אחת: ברז א' ממלא ${m(frac(1, a))} מהבריכה, ברז ב' — ${m(frac(1, 'x'))}, ויחד ${m(frac(1, t))}.`,
          m(`${frac(1, a)} + ${frac(1, 'x')} = ${frac(1, t)}`),
          `כופלים ב-${m(`${a * t}x`)}: ${m(`${t}x + ${a * t} = ${a}x`)}`,
          `${m(`x = ${x}`)}: ברז ב' לבדו — ${x} שעות`,
        ],
        steps: [
          modelStep(
            `איזה חלק מהבריכה ממלא כל ברז בשעה אחת? ושניהם יחד?`,
            `דוגמה: אם ברז ממלא בריכה ב-${m('5')} שעות, בשעה אחת הוא ממלא ${m(frac(1, 5))} ממנה. ההספקים מתחברים.`,
            { latex: `${frac(1, a)} + ${frac(1, 'x')} = ${frac(1, '\\square')}`, answer: t },
            [`ברז שממלא בריכה ב-${m('x')} שעות — איזה חלק הוא ממלא בשעה?`, `ההספק של שניהם יחד = סכום ההספקים.`],
          ),
          helpStep(
            'clear-denominator',
            'היפטרות ממכנים',
            [
              `במה כדאי לכפול כדי להיפטר מכל המכנים?`,
              `כופלים כל איבר במכנה המשותף ${m(`${a * t}x`)} — כל מכנה מצטמצם.`,
              `דוגמה: ${m(`${frac(1, 2)} + ${frac(1, 'x')} = ${frac(1, 1)}`)} — כופלים ב-${m('2x')}: ${m('x + 2 = 2x')}.`,
            ],
            { latex: `${t}x + ${a * t} = \\square\\, x`, answer: a },
            [`כמה זה ${m(`${a * t}x \\cdot ${frac(1, a)}`)}?`, `וכמה זה ${m(`${a * t}x \\cdot ${frac(1, t)}`)}?`],
          ),
          ...linearHelpSteps(rng, f, x),
        ],
        distractors: linearDistractors(f, x, [
          ['word-subtract-times', () => a - t],
          ['word-wrong-unknown', () => div(1, x)],
        ]),
      });
    }
    const [v1, v2] = pick(rng, [[60, 40], [30, 20], [90, 60], [80, 120], [60, 90], [40, 60]] as const);
    const T = randInt(rng, 2, 6);
    const L = lcm(v1, v2);
    const x = (T * v1 * v2) / (v1 + v2);
    const f: Linear = { A: L / v1 + L / v2, B: 0, C: 0, D: T * L };
    return makeQuestion('eq.word', d, {
      prompt: `דנה נסעה מהבית לסבתא במהירות ${v1} קמ"ש, וחזרה באותה דרך במהירות ${v2} קמ"ש. הנסיעה הלוך וחזור נמשכה ${T} שעות. מה המרחק לבית של סבתא?`,
      answer: x,
      pathTitle: 'זמן = דרך חלקי מהירות',
      solution: [
        `נסמן את המרחק ב-${m('x')}. זמן הלוך: ${m(frac('x', v1))}, זמן חזור: ${m(frac('x', v2))}.`,
        m(`${frac('x', v1)} + ${frac('x', v2)} = ${T}`),
        `כופלים ב-${m(String(L))}: ${m(`${L / v1}x + ${L / v2}x = ${T * L}`)}`,
        `${m(`x = ${x}`)}: המרחק ${x} ק"מ`,
      ],
      steps: [
        modelStep(
          `אם המרחק הוא ${m('x')}, כמה זמן לקחה כל אחת מהנסיעות?`,
          `דוגמה: נסיעה של ${m('x')} ק"מ במהירות ${m('50')} לוקחת ${m(frac('x', 50))} שעות.`,
          { latex: `${frac('x', v1)} + ${frac('x', '\\square')} = ${T}`, answer: v2 },
          [`זמן = דרך חלקי מהירות.`, `סכום שני הזמנים הוא הזמן הכולל.`],
        ),
        clearDenominatorStep(rng, [v1, v2], L, T),
        ...linearHelpSteps(rng, f, x),
      ],
      distractors: linearDistractors(f, x, [
        ['word-average-speed', () => div(T * (v1 + v2), 4)],
        ['word-wrong-unknown', () => 2 * x],
      ]),
    });
  }
}

export const shortMultGenerator: GeneratorDef<Question> = {
  id: 'eq.shortMult', topic: 'equations', title: 'משוואות עם כפל מקוצר', minDifficulty: 1, maxDifficulty: 5, generate: shortMultQuestion,
};
export const rationalGenerator: GeneratorDef<Question> = {
  id: 'eq.rational', topic: 'equations', title: 'משוואות עם x במכנה', minDifficulty: 1, maxDifficulty: 5, generate: rationalQuestion,
};
export const paramGenerator: GeneratorDef<Question> = {
  id: 'eq.param', topic: 'equations', title: 'משוואות עם פרמטר', minDifficulty: 1, maxDifficulty: 5, generate: paramQuestion,
};
export const wordGenerator: GeneratorDef<Question> = {
  id: 'eq.word', topic: 'equations', title: 'בעיות מילוליות', minDifficulty: 1, maxDifficulty: 5, generate: wordQuestion,
};
