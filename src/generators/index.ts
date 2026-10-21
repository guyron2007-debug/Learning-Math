import type { GeneratorDef } from '../engine/types';
import {
  linearGenerator,
  fractionGenerator,
  inequalityGenerator,
  systemGenerator,
  linearStepsGenerator,
  fractionStepsGenerator,
  systemStepsGenerator,
  shortMultGenerator,
  rationalGenerator,
  paramGenerator,
  wordGenerator,
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
    shortMultGenerator,
    rationalGenerator,
    paramGenerator,
    wordGenerator,
  ].map((g) => [g.id, g as GeneratorDef]),
);
