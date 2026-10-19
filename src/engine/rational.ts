/** Minimal exact rational arithmetic for building "nice" questions. */
export interface Q {
  readonly n: number;
  readonly d: number;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

export function q(n: number, d = 1): Q {
  if (d === 0) throw new Error('Division by zero');
  if (!Number.isInteger(n) || !Number.isInteger(d)) throw new Error('q() expects integers');
  const g = gcd(n, d) || 1;
  const s = d < 0 ? -1 : 1;
  return { n: (s * n) / g + 0, d: (s * d) / g };
}

export const toQ = (x: Q | number): Q => (typeof x === 'number' ? q(x) : x);
export const add = (a: Q | number, b: Q | number) => {
  const x = toQ(a), y = toQ(b);
  return q(x.n * y.d + y.n * x.d, x.d * y.d);
};
export const sub = (a: Q | number, b: Q | number) => add(a, neg(b));
export const mul = (a: Q | number, b: Q | number) => {
  const x = toQ(a), y = toQ(b);
  return q(x.n * y.n, x.d * y.d);
};
export const div = (a: Q | number, b: Q | number) => {
  const x = toQ(a), y = toQ(b);
  return q(x.n * y.d, x.d * y.n);
};
export const neg = (a: Q | number) => {
  const x = toQ(a);
  return q(-x.n, x.d);
};
export const isInt = (a: Q | number) => toQ(a).d === 1;
export const isZero = (a: Q | number) => toQ(a).n === 0;
export const qEq = (a: Q | number, b: Q | number) => {
  const x = toQ(a), y = toQ(b);
  return x.n === y.n && x.d === y.d;
};
export const toNumber = (a: Q | number) => {
  const x = toQ(a);
  return x.n / x.d;
};

export function qLatex(a: Q | number): string {
  const x = toQ(a);
  if (x.d === 1) return String(x.n);
  const sign = x.n < 0 ? '-' : '';
  return `${sign}\\frac{${Math.abs(x.n)}}{${x.d}}`;
}

/** Plain-text form, as the student would type it: "-3/4". */
export function qText(a: Q | number): string {
  const x = toQ(a);
  return x.d === 1 ? String(x.n) : `${x.n}/${x.d}`;
}
