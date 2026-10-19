import type { GeneratorDef } from '../engine/types';
import {
  linearGenerator,
  fractionGenerator,
  inequalityGenerator,
  systemGenerator,
  linearStepsGenerator,
  fractionStepsGenerator,
  systemStepsGenerator,
} from './equations';

export const generators: Record<string, GeneratorDef> = Object.fromEntries(
  [
    linearGenerator,
    fractionGenerator,
    inequalityGenerator,
    systemGenerator,
    linearStepsGenerator,
    fractionStepsGenerator,
    systemStepsGenerator,
  ].map((g) => [g.id, g as GeneratorDef]),
);
