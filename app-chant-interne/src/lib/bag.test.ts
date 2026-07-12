import { describe, expect, it } from 'vitest';
import { PairBag } from './bag';
import type { PairKey } from './theory';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POOL: PairKey[] = ['1:asc', '2:asc', '3:asc', '5:asc', '7:desc'];

describe('PairBag', () => {
  it('chaque paire sort exactement une fois par cycle', () => {
    const bag = new PairBag(POOL, mulberry32(42));
    for (let cycle = 0; cycle < 3; cycle++) {
      const drawn = Array.from({ length: POOL.length }, () => bag.next());
      expect([...drawn].sort()).toEqual([...POOL].sort());
    }
  });

  it('jamais deux fois de suite la même paire, même entre deux sacs', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const bag = new PairBag(POOL, mulberry32(seed));
      let prev: PairKey | null = null;
      for (let i = 0; i < 300; i++) {
        const k = bag.next();
        if (prev !== null) expect(k).not.toBe(prev);
        prev = k;
      }
    }
  });

  it('pool à un seul élément : répète sans broncher', () => {
    const bag = new PairBag(['8:asc'], mulberry32(1));
    for (let i = 0; i < 5; i++) expect(bag.next()).toBe('8:asc');
  });

  it('pool vide : lève une erreur', () => {
    const bag = new PairBag([], mulberry32(1));
    expect(() => bag.next()).toThrow();
  });
});
