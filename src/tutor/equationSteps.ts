/**
 * Reusable help steps for the equations world (spec B.4.2 / B.4.6).
 * Each step has a guiding question, a rule reminder, a parallel example with different numbers,
 * and a fill-in-the-blank. None of them may state the final answer (checked in tests).
 */
import type { HelpStep } from './types';
import { type Rng, randInt, randNonZero } from '../engine/rng';
import { type Q, qLatex, toQ } from '../engine/rational';
import { linExpr, m, paren } from '../engine/format';

const xPlus = (a: number) => linExpr([[1, 'x'], [a, '']]);
const num = (n: number | Q) => m(qLatex(toQ(n)));

/** Picks small example numbers whose solution differs from every value in `avoid`. */
function exampleValue(rng: Rng, avoid: number[], min = 2, max = 9): number {
  for (let i = 0; i < 50; i++) {
    const v = randInt(rng, min, max);
    if (!avoid.some((a) => Math.abs(a - v) < 1e-9)) return v;
  }
  return max + 1 + Math.max(0, ...avoid.map(Math.abs));
}

/** a(x + b) → ax + ab, for one or more products. */
export function distributeStep(rng: Rng, products: Array<[number, number]>): HelpStep {
  const [a, b] = products[0];
  const ea = randNonZero(rng, 2, 6, [Math.abs(a)]);
  const eb = randInt(rng, 1, 7);
  return {
    skill: 'distribute',
    label: 'פתיחת סוגריים',
    hints: [
      `מה עושים עם ה-${num(a)} שמחוץ לסוגריים?`,
      `כופלים את המספר שמחוץ לסוגריים בכל איבר שבפנים: גם ב-${m('x')} וגם במספר.${products.length > 1 ? ' וכך בכל זוג סוגריים — כולל הסימן שלפניהם.' : ''}`,
      `דוגמה: ${m(`${ea}(x + ${eb}) = ${ea}x + ${ea * eb}`)}`,
    ],
    blank: { latex: `${a} \\cdot ${paren(b)} = \\square`, answer: a * b },
    subSteps: [`כמה זה ${m(`${a} \\cdot x`)}?`, `וכמה זה ${m(`${a} \\cdot ${paren(b)}`)}? שימי לב לסימנים.`],
    fixes: {
      'distribute-partial': `בדקי: כפלת את ${num(a)} גם במספר ${num(b)} שבתוך הסוגריים?`,
      'distribute-sign': `בדקי את הסימן: ${m(`${a} \\cdot ${paren(b)}`)} — חיובי או שלילי?`,
    },
  };
}

/** A·x + B (rel) C·x + D  →  k·x (rel) r, by moving terms across. */
export function collectStep(
  rng: Rng,
  f: { A: number; B: number; C: number; D: number },
  avoid: number[],
  rel = '=',
): HelpStep {
  const k = f.A - f.C;
  const r = f.D - f.B;
  const ea = randInt(rng, 4, 8);
  const ec = randInt(rng, 1, ea - 2);
  const ex = exampleValue(rng, avoid, 1, 6);
  const eb = randInt(rng, 1, 9);
  const ed = (ea - ec) * ex + eb;
  const sub: string[] = [];
  if (f.C !== 0) sub.push(`מה קורה ל-${m(linExpr([[f.C, 'x']]))} כשהוא עובר לצד שמאל?`);
  if (f.B !== 0) sub.push(`מה קורה ל-${num(f.B)} כשהוא עובר לצד ימין?`);
  sub.push(`עכשיו כנסי: כמה ${m('x')}-ים יש משמאל, וכמה זה ${m(`${f.D} ${f.B < 0 ? '+' : '-'} ${Math.abs(f.B)}`)}?`);
  return {
    skill: 'move-term-sign',
    label: 'העברת אגפים',
    hints: [
      f.C !== 0
        ? `יש ${m('x')} בשני הצדדים. מה צריך לעבור צד כדי ש-${m('x')} יהיה רק משמאל?`
        : `מה מפריע ל-${m(linExpr([[f.A, 'x']]))} להיות לבד בצד שמאל?`,
      `איבר שעובר לצד השני מחליף סימן: פלוס הופך למינוס, ומינוס לפלוס.`,
      `דוגמה: ב-${m(`${ea}x + ${eb} ${rel} ${ec}x + ${ed}`)} מעבירים ומקבלים ${m(`${ea}x - ${ec}x ${rel} ${ed} - ${eb}`)}, כלומר ${m(`${ea - ec}x ${rel} ${ed - eb}`)}.`,
    ],
    blank: { latex: `${linExpr([[k, 'x']])} ${rel} \\square`, answer: r },
    subSteps: sub,
    fixes: {
      'sign-move': `בדקי את הסימן של ${num(f.B)} אחרי שהעברת אותו לצד השני.`,
      'coef-sign': `בדקי את הסימן של ${m(linExpr([[f.C, 'x']]))} אחרי שהעברת אותו לצד שמאל.`,
    },
  };
}

/** k·x = r  →  x = r / k. She always performs this last step herself. */
export function divideStep(rng: Rng, k: number, r: number, avoid: number[]): HelpStep {
  const ek = randNonZero(rng, 2, 7, [Math.abs(k)]) * (k < 0 ? -1 : 1);
  const ex = exampleValue(rng, avoid, 2, 9) * (rng() < 0.5 ? -1 : 1);
  const exampleX = avoid.includes(ex) ? -ex : ex;
  return {
    skill: 'divide-coefficient',
    label: 'חלוקה במקדם',
    hints: [
      `מה עדיין "צמוד" ל-${m('x')}?`,
      `כדי לבטל כפל ב-${num(k)}, מחלקים את שני האגפים ב-${num(k)}.`,
      `דוגמה: ב-${m(`${ek}x = ${ek * exampleX}`)} מחלקים את שני האגפים ב-${m(String(ek))} ומקבלים ${m(`x = ${exampleX}`)}.`,
    ],
    blank: { latex: `x = \\frac{${r}}{\\square}`, answer: k },
    subSteps: [`במה מוכפל ${m('x')}?`, `נסי לחשב: ${num(r)} חלקי ${num(k)}. אפשר לצמצם?`],
    fixes: {
      'divide-wrong': `שימי לב: ${m('x')} מוכפל ב-${num(k)}, אז צריך לחלק — לא לכפול.`,
      partial: `כמעט! ${m(linExpr([[k, 'x']]))} זה עוד לא ${m('x')} לבד.`,
      'divide-sign': `בדקי את הסימן בחלוקה ב-${num(k)}.`,
    },
  };
}

/** Lowest common denominator of p and q. */
export function commonDenominatorStep(p: number, q: number, L: number): HelpStep {
  const big = Math.max(p, q), small = Math.min(p, q);
  return {
    skill: 'common-denominator',
    label: 'מכנה משותף',
    hints: [
      `מה המכנים כאן? חפשי מספר שמתחלק בכולם.`,
      `מכנה משותף הוא מספר שמתחלק בכל המכנים. כדאי לבחור את הקטן ביותר.`,
      `דוגמה: למכנים ${m('4')} ו-${m('6')} המכנה המשותף הקטן ביותר הוא ${m('12')} (ולא ${m('24')}).`,
    ],
    blank: { latex: `${p},\\ ${q} \;\\to\; \\square`, answer: L },
    subSteps: [`מהן הכפולות של ${num(big)}? (${m(`${big}, ${2 * big}, ${3 * big}, \\dots`)})`, `איזו מהן מתחלקת גם ב-${num(small)}?`],
    fixes: {
      'lcd-product': `${m(`${p} \\cdot ${q}`)} עובד, אבל יש מכנה משותף קטן יותר. נסי למצוא אותו.`,
      'lcd-sum': `מכנה משותף צריך להתחלק בשני המכנים — האם ${m(String(p + q))} מתחלק בשניהם?`,
    },
  };
}

/** Multiply every term by L to clear the denominators. */
export function clearDenominatorStep(rng: Rng, dens: number[], L: number, rhs: number): HelpStep {
  const [d0] = dens;
  const e1 = randInt(rng, 2, 3);
  const e2 = e1 + 1;
  const er = randInt(rng, 2, 6);
  return {
    skill: 'clear-denominator',
    label: 'היפטרות ממכנים',
    hints: [
      `מה יקרה לשברים אם נכפול את כל המשוואה ב-${num(L)}?`,
      `כופלים כל איבר ב-${num(L)} — כל שבר, וגם את המספר שבצד השני. כל מכנה מצטמצם.`,
      `דוגמה: ב-${m(`\\frac{x}{${e1}} + \\frac{x}{${e2}} = ${er}`)} כופלים ב-${m(String(e1 * e2))} ומקבלים ${m(`${e2}x + ${e1}x = ${er * e1 * e2}`)}.`,
    ],
    // One denominator: ask for the multiplied right-hand side; several: for the first numerator's factor.
    blank: dens.length === 1 ? { latex: `${paren(rhs)} \\cdot ${L} = \\square`, answer: rhs * L } : { latex: `${L} : ${d0} = \\square`, answer: L / d0 },
    subSteps: [`כמה זה ${m(`${L} : ${d0}`)}? זה המספר שיכפיל את המונה הראשון.`, `ומה מקבלים מהמספר ${num(rhs)} שבצד השני אחרי הכפל ב-${num(L)}?`],
    fixes: {
      'clear-rhs': `כפלת גם את הצד השני של המשוואה ב-${num(L)}?`,
      'clear-swap': `בדקי: כל מונה מוכפל ב-${num(L)} חלקי המכנה שלו.`,
      'clear-numerator': `כשמכפילים מונה בסוגריים, מכפילים את כולו — גם את ה-${m('x')} וגם את המספר.`,
    },
  };
}

export function domainStep(rng: Rng, roots: number[], avoid: number[]): HelpStep {
  const ex = exampleValue(rng, avoid, 2, 7);
  return {
    skill: 'domain-restriction',
    label: 'תחום הצבה',
    hints: [
      `איזה ערך של ${m('x')} היה הופך מכנה לאפס?`,
      `אסור לחלק באפס, לכן בודקים מתי כל מכנה מתאפס — את הערכים האלה מוציאים מהתחום.`,
      `דוגמה: ב-${m(`\\frac{5}{x - ${ex}}`)} המכנה מתאפס כש-${m('x')} שווה ${m(String(ex))}, לכן ${m(`x \\neq ${ex}`)}.`,
    ],
    blank: { latex: `x \\neq \\square`, answer: roots[0] },
    subSteps: [`מתי ${m(xPlus(-roots[0]))} שווה ${m('0')}?`],
  };
}

export function crossMultiplyStep(rng: Rng, A: number, C: number, b: number, e: number): HelpStep {
  const e1 = randInt(rng, 2, 5), e2 = e1 + randInt(rng, 1, 3);
  return {
    skill: 'cross-multiply',
    label: 'כפל בהצלבה',
    hints: [
      `יש כאן שבר ששווה לשבר. איך אפשר להיפטר משני המכנים בבת אחת?`,
      `כפל בהצלבה: המונה של כל שבר כפול המכנה של השבר השני.`,
      `דוגמה: ${m(`\\frac{${e1}}{x + 1} = \\frac{${e2}}{x}`)} הופך ל-${m(`${e1}x = ${e2}(x + 1)`)}.`,
    ],
    blank: { latex: `${A}(${xPlus(e)}) = \\square \\cdot (${xPlus(b)})`, answer: C },
    subSteps: [`מה המונה של השבר השמאלי, ומה המכנה של הימני?`, `ומה המונה של הימני כפול המכנה של השמאלי?`],
    fixes: { 'distribute-partial': `אחרי ההצלבה, בדקי שכפלת את כל הסוגריים.` },
  };
}

/** k·x (op) r → divide by k, flipping the sign when k < 0. */
export function inequalityDivideStep(rng: Rng, k: number, r: number, op: string, avoid: number[]): HelpStep {
  const ek = -randInt(rng, 2, 5);
  const eb = exampleValue(rng, avoid, 1, 6);
  const negative = k < 0;
  return {
    skill: negative ? 'inequality-flip' : 'divide-coefficient',
    label: negative ? 'חלוקה במספר שלילי' : 'חלוקה במקדם',
    hints: [
      negative ? `במה צריך לחלק כדי לבודד את ${m('x')}? ומה מיוחד במספר הזה?` : `במה צריך לחלק כדי ש-${m('x')} יישאר לבד?`,
      `כשמחלקים או כופלים אי-שוויון במספר שלילי, הופכים את כיוון הסימן. במספר חיובי — הסימן נשאר.`,
      `דוגמה: ב-${m(`${ek}x > ${ek * eb}`)} מחלקים ב-${m(String(ek))} והופכים: ${m(`x < ${eb}`)}.`,
    ],
    blank: { latex: `x \;?\; \\frac{${r}}{\\square}`, answer: k },
    subSteps: [`מה המקדם של ${m('x')}? הוא חיובי או שלילי?`, `אז האם הסימן ${m(op)} נשאר כמו שהוא, או מתהפך?`],
    fixes: {
      'no-flip': `המקדם ${num(k)} שלילי. מה קורה לסימן כשמחלקים בו?`,
      'flip-unneeded': `המקדם ${num(k)} חיובי. האם באמת צריך להפוך את הסימן?`,
      strictness: `שימי לב אם הסימן כולל שוויון (${m('\\le')}) או לא (${m('<')}).`,
    },
  };
}

// ---------- Systems of two equations ----------

export interface SystemParams {
  a1: number; b1: number; c1: number;
  a2: number; b2: number; c2: number;
  x: number; y: number;
}

/** Example system with a solution different from the real one. */
function exampleSystem(rng: Rng, s: SystemParams) {
  let ex = randInt(rng, 1, 4), ey = randInt(rng, 1, 4);
  if (ex === s.x) ex += 1;
  if (ey === s.y) ey += 1;
  return { ex, ey };
}

export function eliminationScaleStep(rng: Rng, s: SystemParams, k1: number): HelpStep {
  const { ex, ey } = exampleSystem(rng, s);
  return {
    skill: 'two-eq-elimination',
    label: 'השוואת מקדמים',
    hints: [
      `איך אפשר לגרום למקדמי ${m('y')} בשתי המשוואות להיות שווים?`,
      `כופלים משוואה שלמה במספר — את כל האיברים שלה, משני הצדדים — כך שלמשתנה אחד יהיה אותו מקדם בשתיהן.`,
      `דוגמה: ב-${m(`x + 2y = ${ex + 2 * ey}`)} ו-${m(`3x + 5y = ${3 * ex + 5 * ey}`)} כופלים את הראשונה ב-${m('5')} ואת השנייה ב-${m('2')}: ל-${m('y')} יש מקדם ${m('10')} בשתיהן.`,
    ],
    blank: { latex: `${paren(s.b1)} \\cdot \\square = ${s.b1 * k1}`, answer: k1 },
    subSteps: [`מה המקדם של ${m('y')} בכל משוואה?`, `מה המספר הקטן ביותר ששני המקדמים מתחלקים בו?`],
    fixes: { 'scale-sign': `בדקי את הסימן של המספר שבו כפלת.` },
  };
}

export function eliminationSubtractStep(rng: Rng, cx: number, cr: number): HelpStep {
  const e = randInt(rng, 2, 5);
  return {
    skill: 'two-eq-elimination',
    label: 'חיסור המשוואות',
    hints: [
      `עכשיו למקדמי ${m('y')} יש אותו ערך. מה עושים כדי ש-${m('y')} ייעלם?`,
      `מחסרים את המשוואות: צד שמאל מצד שמאל וצד ימין מצד ימין. שימי לב למינוס לפני כל איבר.`,
      `דוגמה: ${m(`(${e + 2}x + 4y) - (2x + 4y) = ${e}x`)} — ה-${m('y')} נעלם.`,
    ],
    blank: { latex: `\\square\\, x = ${cr}`, answer: cx },
    subSteps: [`חסרי רק את מקדמי ה-${m('x')}: מה יוצא?`, `עכשיו חסרי את המספרים שבצד ימין.`],
    fixes: { 'elim-add': `חיסרת את כל האיברים? מינוס לפני סוגריים הופך כל סימן בפנים.` },
  };
}

export function substitutionIsolateStep(rng: Rng, s: SystemParams): HelpStep {
  // b1 = ±1:  y = b1·c1 − b1·a1·x
  const { ex } = exampleSystem(rng, s);
  return {
    skill: 'two-eq-substitution',
    label: 'בידוד משתנה',
    hints: [
      `באיזו משוואה קל לבודד את ${m('y')}?`,
      `במשוואה שבה המקדם של ${m('y')} הוא ${m('1')} (או ${m('-1')}), מעבירים את כל השאר לצד השני.`,
      `דוגמה: מ-${m(`3x + y = ${3 * ex + 4}`)} מקבלים ${m(`y = ${3 * ex + 4} - 3x`)}.`,
    ],
    blank: { latex: `y = ${s.b1 * s.c1} + \\square\\, x`, answer: -s.b1 * s.a1 },
    subSteps: [`מה עובר לצד ימין כש-${m('y')} נשאר לבד?`, `איזה סימן יש לאיבר עם ${m('x')} אחרי ההעברה?`],
  };
}

export function substitutionPlugStep(rng: Rng, cx: number, cr: number): HelpStep {
  const e = randInt(rng, 2, 4);
  return {
    skill: 'two-eq-substitution',
    label: 'הצבה',
    hints: [
      `מה אפשר לשים במקום ${m('y')} במשוואה השנייה?`,
      `מחליפים את ${m('y')} בביטוי שמצאת — בתוך סוגריים — ומקבלים משוואה עם ${m('x')} בלבד.`,
      `דוגמה: אם ${m(`y = 5 - ${e}x`)} ו-${m('x + 2y = 4')}, מציבים: ${m(`x + 2(5 - ${e}x) = 4`)}.`,
    ],
    blank: { latex: `\\square\\, x = ${cr}`, answer: cx },
    subSteps: [`כתבי את המשוואה השנייה, ובמקום ${m('y')} — את הביטוי בסוגריים.`, `פתחי סוגריים וכנסי את ה-${m('x')}-ים.`],
  };
}

export function backSubstituteStep(rng: Rng, s: SystemParams): HelpStep {
  const { ex, ey } = exampleSystem(rng, s);
  return {
    skill: 'back-substitute',
    label: 'מציאת y',
    hints: [
      `יש לך כבר את ${m('x')}. איך ממנו מגיעים ל-${m('y')}?`,
      `מציבים את הערך של ${m('x')} באחת המשוואות המקוריות, ופותרים משוואה עם ${m('y')} בלבד.`,
      `דוגמה: אם ${m(`x = ${ex}`)} ו-${m(`x + y = ${ex + ey}`)}, אז ${m(`${ex} + y = ${ex + ey}`)} ולכן ${m(`y = ${ey}`)}.`,
    ],
    blank: { latex: `${linExpr([[s.b1, 'y']])} = ${s.c1} - \\square`, answer: s.a1 * s.x },
    subSteps: [`הציבי את ה-${m('x')} שמצאת במשוואה הראשונה, במקום ${m('x')}.`, `כמה זה ${m(`${s.a1} \\cdot x`)} עם ה-${m('x')} שמצאת?`],
    fixes: { 'swap-xy': `בדקי שלא התחלפו לך ${m('x')} ו-${m('y')}.`, 'sign-y': `בדקי את הסימן של ${m('y')} בסוף.` },
  };
}
