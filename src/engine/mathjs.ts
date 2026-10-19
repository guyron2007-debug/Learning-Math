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
} from 'mathjs/number';

export type { MathNode } from 'mathjs/number';

// A slim math.js instance: only what answer checking needs (keeps the bundle small).
export const { parse } = create({
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
