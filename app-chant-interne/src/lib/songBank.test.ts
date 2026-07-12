import { describe, expect, it } from 'vitest';
import { SONG_HOOKS, findHook, hookFirstLeap, transposeHook } from './songBank';
import { parsePairKey } from './theory';

describe('intégrité de la banque d’airs (garde-fou anti-faux-hooks)', () => {
  it('chaque hook démarre à 0 et son premier saut EST l’intervalle signé de sa paire', () => {
    for (const hook of SONG_HOOKS) {
      const pair = parsePairKey(hook.pair);
      expect(pair, hook.title).not.toBeNull();
      expect(hook.notes[0][0], hook.title).toBe(0);
      const leap = hookFirstLeap(hook);
      expect(leap, hook.title).toBeDefined();
      const expected = pair!.dir === 'asc' ? pair!.def.semitones : -pair!.def.semitones;
      expect(leap, hook.title).toBe(expected);
    }
  });

  it('durées positives, départs croissants, ambitus raisonnable', () => {
    for (const hook of SONG_HOOKS) {
      let prevAt = -1;
      for (const [semis, at, dur] of hook.notes) {
        expect(dur, hook.title).toBeGreaterThan(0);
        expect(at, hook.title).toBeGreaterThanOrEqual(prevAt);
        expect(Math.abs(semis), hook.title).toBeLessThanOrEqual(24);
        prevAt = at;
      }
      expect(hook.bpm).toBeGreaterThan(30);
      expect(hook.bpm).toBeLessThan(250);
    }
  });

  it('au plus un hook par paire', () => {
    const pairs = SONG_HOOKS.map((h) => h.pair);
    expect(new Set(pairs).size).toBe(pairs.length);
  });
});

describe('findHook', () => {
  it('ne renvoie que les hooks validés', () => {
    expect(findHook('1:asc')?.title).toBe('Les Dents de la mer');
    expect(findHook('2:desc')).toBeUndefined(); // Yesterday : à valider par Theo
    expect(findHook('13:asc')).toBeUndefined(); // aucune 9m célèbre
  });
});

describe('transposeHook', () => {
  it('transpose depuis NE et convertit temps → secondes', () => {
    const twinkle = SONG_HOOKS.find((h) => h.pair === '7:asc')!;
    const notes = transposeHook(twinkle, 60);
    expect(notes[0]).toEqual({ midi: 60, at: 0, dur: 0.6 });
    expect(notes[2]).toEqual({ midi: 67, at: 1.2, dur: 0.6 });
  });
});
