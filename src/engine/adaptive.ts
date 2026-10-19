import { clampDifficulty, type Difficulty } from './types';

/** Difficulty goes up after 3 correct answers in a row and down after 2 wrong ones (aiming at ~75% success). */
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
      if (++this.right >= 3) {
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
