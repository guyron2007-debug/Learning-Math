import {
  create,
  parseDependencies,
  addDependencies,
  subtractDependencies,
  multiplyDependencies,
  divideDependencies,
  powDependencies,
  sqrtDependencies,
  unaryMinusDependencies,
  unaryPlusDependencies,
  absDependencies,
  type MathNode,
} from 'mathjs/number';

// A slim math.js instance: only what expression equivalence needs (keeps the bundle small).
const { parse } = create({
  parseDependencies,
  addDependencies,
  subtractDependencies,
  multiplyDependencies,
  divideDependencies,
  powDependencies,
  sqrtDependencies,
  unaryMinusDependencies,
  unaryPlusDependencies,
  absDependencies,
});

/** Normalizes on-screen keypad symbols and unicode into something mathjs can parse. */
export function normalizeInput(raw: string): string {
  return raw
    .replace(/[−–]/g, '-')
    .replace(/[·×]/g, '*')
    .replace(/÷/g, '/')
    .replace(/√/g, 'sqrt')
    .replace(/,/g, '.')
    .trim();
}

/** Parses "3", "-1.5", "3/4", "-3 / 4", "3/-4". Returns null for anything else. */
export function parseNumber(raw: string): number | null {
  const s = normalizeInput(raw).replace(/\s+/g, '');
  const num = '[-+]?(?:\\d+\\.?\\d*|\\.\\d+)';
  const frac = s.match(new RegExp(`^(${num})(?:/(${num}))?$`));
  if (!frac) return null;
  const top = Number(frac[1]);
  if (frac[2] === undefined) return top;
  const bottom = Number(frac[2]);
  return bottom === 0 ? null : top / bottom;
}

export function numbersEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

export function checkNumber(raw: string, expected: number): boolean {
  const n = parseNumber(raw);
  return n !== null && numbersEqual(n, expected);
}

function compile(expr: string): MathNode | null {
  try {
    return parse(normalizeInput(expr));
  } catch {
    return null;
  }
}

/**
 * Algebraic equivalence by evaluating both expressions at random points
 * (e.g. "2(x+1)" ≡ "2x+2"), rather than comparing strings.
 */
export function checkExpression(raw: string, expected: string, variables: string[] = ['x']): boolean {
  const a = compile(raw);
  const b = compile(expected);
  if (!a || !b) return false;
  const fa = a.compile();
  const fb = b.compile();
  let compared = 0;
  for (let i = 0; i < 12; i++) {
    const scope: Record<string, number> = {};
    for (const v of variables) scope[v] = Math.round((Math.random() * 20 - 10) * 1000) / 1000 + 0.137;
    let va: unknown, vb: unknown;
    try {
      va = fa.evaluate(scope);
      vb = fb.evaluate(scope);
    } catch {
      return false;
    }
    if (typeof va !== 'number' || typeof vb !== 'number') return false;
    if (!Number.isFinite(va) || !Number.isFinite(vb)) continue;
    if (!numbersEqual(va, vb) && Math.abs(va - vb) > 1e-7) return false;
    compared++;
  }
  return compared >= 6;
}
