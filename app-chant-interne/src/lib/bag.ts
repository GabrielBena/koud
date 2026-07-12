// Tirage « sac » : chaque paire sélectionnée sort une fois avant toute
// répétition, et jamais deux fois de suite à cheval sur deux sacs.

import type { PairKey } from './theory';
import type { Rand } from './exercise';

export class PairBag {
  private remaining: PairKey[] = [];
  private lastDrawn: PairKey | null = null;

  constructor(
    private readonly pool: readonly PairKey[],
    private readonly rand: Rand = Math.random,
  ) {}

  next(): PairKey {
    if (this.pool.length === 0) throw new Error('PairBag : pool vide');
    if (this.remaining.length === 0) this.refill();
    const key = this.remaining.pop()!;
    this.lastDrawn = key;
    return key;
  }

  private refill(): void {
    this.remaining = shuffle([...this.pool], this.rand);
    const top = this.remaining.length - 1;
    if (this.pool.length > 1 && this.remaining[top] === this.lastDrawn) {
      const j = Math.floor(this.rand() * top);
      [this.remaining[top], this.remaining[j]] = [this.remaining[j], this.remaining[top]];
    }
  }
}

function shuffle<T>(arr: T[], rand: Rand): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
