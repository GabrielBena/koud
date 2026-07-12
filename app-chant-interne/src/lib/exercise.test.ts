import { describe, expect, it } from 'vitest';
import { INTERVALS } from './theory';
import { drawExercise, drawNE, listeningRange } from './exercise';

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

describe('listeningRange', () => {
  it('ascendant : translation vers le bas ; descendant : vers le haut', () => {
    expect(listeningRange(48, 60, 7, 'asc')).toEqual([41, 53]);
    expect(listeningRange(48, 60, 7, 'desc')).toEqual([55, 67]);
  });
  it('préserve la largeur', () => {
    const [lo, hi] = listeningRange(45, 64, 14, 'asc');
    expect(hi - lo).toBe(64 - 45);
  });
});

describe('drawExercise — invariant central de la spec', () => {
  it('NC tombe TOUJOURS dans l’ambitus vocal, NE dans l’ambitus d’écoute', () => {
    const rand = mulberry32(2026);
    const ranges: [number, number][] = [
      [45, 57], // baryton raisonnable
      [48, 50], // ambitus plus étroit que la plupart des intervalles
      [60, 60], // ambitus d’une seule note (largeur 1)
      [40, 64], // deux octaves
    ];
    for (const [low, high] of ranges) {
      for (const def of INTERVALS) {
        for (const dir of ['asc', 'desc'] as const) {
          let prev: number | null = null;
          for (let i = 0; i < 200; i++) {
            const ex = drawExercise(low, high, def, dir, prev, rand);
            const [lo, hi] = listeningRange(low, high, def.semitones, dir);
            expect(ex.ne).toBeGreaterThanOrEqual(lo);
            expect(ex.ne).toBeLessThanOrEqual(hi);
            expect(ex.nc).toBeGreaterThanOrEqual(low);
            expect(ex.nc).toBeLessThanOrEqual(high);
            expect(ex.nc).toBe(dir === 'asc' ? ex.ne + def.semitones : ex.ne - def.semitones);
            prev = ex.ne;
          }
        }
      }
    }
  });

  it('largeur 1 : pas de boucle infinie, la répétition est permise', () => {
    const def = INTERVALS.find((d) => d.semitones === 7)!;
    const rand = mulberry32(7);
    const a = drawExercise(60, 60, def, 'asc', null, rand);
    expect(a.ne).toBe(53);
    const b = drawExercise(60, 60, def, 'asc', a.ne, rand);
    expect(b.ne).toBe(53);
  });
});

describe('drawNE', () => {
  it('jamais deux fois de suite la même note quand la largeur > 1', () => {
    const rand = mulberry32(99);
    let prev: number | null = null;
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const ne = drawNE([50, 54], prev, rand);
      expect(ne).toBeGreaterThanOrEqual(50);
      expect(ne).toBeLessThanOrEqual(54);
      if (prev !== null) expect(ne).not.toBe(prev);
      seen.add(ne);
      prev = ne;
    }
    expect(seen.size).toBe(5); // toutes les notes de la plage sortent
  });

  it('reste borné même si rand frôle 1', () => {
    const almostOne = () => 0.999999999;
    expect(drawNE([50, 54], null, almostOne)).toBe(54);
    expect(drawNE([50, 54], 54, almostOne)).toBe(53);
  });

  it('prevNe hors plage : tirage uniforme simple', () => {
    const rand = mulberry32(5);
    for (let i = 0; i < 100; i++) {
      const ne = drawNE([50, 54], 90, rand);
      expect(ne).toBeGreaterThanOrEqual(50);
      expect(ne).toBeLessThanOrEqual(54);
    }
  });
});
