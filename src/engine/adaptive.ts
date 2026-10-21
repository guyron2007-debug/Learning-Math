import { clampDifficulty, type Difficulty } from './types';

/** Difficulty goes up after 2 correct answers in a row and down after 2 wrong ones. */
export class AdaptiveDifficulty {
  private right = 0;
  private wrong = 0;
  constructor(
    public level: Difficulty,
    private readonly min: Difficulty = 1,
    private readonly max: Difficulty = 5,
  ) {}

  record(correct: boolean): Difficulty {
    if (correct) {
      this.wrong = 0;
      if (++this.right >= 2) {
        this.level = clampDifficulty(this.level + 1, this.min, this.max);
        this.right = 0;
      }
    } else {
      this.right = 0;
      if (++this.wrong >= 2) {
        this.level = clampDifficulty(this.level - 1, this.min, this.max);
        this.wrong = 0;
      }
    }
    return this.level;
  }
}

/**
 * Where a level starts: where she finished it last time, but never below the level's own start.
 * The floor is one below the start, so a hard run can ease off a little without going back to basics.
 */
export function levelAdaptive(level: { startDifficulty: Difficulty; maxDifficulty: Difficulty }, remembered: Difficulty | undefined, minFloor: Difficulty = 1): AdaptiveDifficulty {
  const start = clampDifficulty(Math.max(level.startDifficulty, remembered ?? 0), level.startDifficulty, level.maxDifficulty);
  const min = clampDifficulty(Math.max(minFloor, level.startDifficulty - 1), 1, level.startDifficulty);
  return new AdaptiveDifficulty(start, min, level.maxDifficulty);
}
