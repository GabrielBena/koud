import { describe, expect, it } from 'vitest';
import {
  ALL_PAIRS,
  INTERVALS,
  pairKey,
  pairLabel,
  parsePairKey,
  spellMidi,
  spellPair,
} from './theory';

const iv = (label: string) => INTERVALS.find((d) => d.label === label)!;
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

describe('INTERVALS', () => {
  it('couvre 2m→9M avec les bons demi-tons', () => {
    expect(INTERVALS.map((d) => d.semitones)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(iv('4A').quality).toBe('A');
    expect(iv('8').degree).toBe(8);
    expect(ALL_PAIRS).toHaveLength(28);
  });
});

describe('clés de paires et labels', () => {
  it('roundtrip parse/format', () => {
    for (const k of ALL_PAIRS) {
      const p = parsePairKey(k)!;
      expect(p).not.toBeNull();
      expect(pairKey(p.def, p.dir)).toBe(k);
    }
  });
  it('clés invalides → null', () => {
    expect(parsePairKey('15:asc')).toBeNull();
    expect(parsePairKey('10:sideways')).toBeNull();
    expect(parsePairKey('n/a')).toBeNull();
  });
  it('labels façon Theo', () => {
    expect(pairLabel(iv('7m'), 'asc')).toBe('7m↑');
    expect(pairLabel(iv('2M'), 'desc')).toBe('2M↓');
    expect(pairLabel(iv('4A'), 'asc')).toBe('4A↑');
  });
});

describe('spellPair', () => {
  it('vecteur de la spec : 7m↑ depuis E5 → D6', () => {
    const { ne, nc } = spellPair(76, iv('7m'), 'asc');
    expect(ne.text).toBe('E5');
    expect(nc.text).toBe('D6');
    expect(nc.midi).toBe(86);
  });

  it('4A au-dessus de D♭4 → G4 (jamais C♯4 → F𝄪4)', () => {
    const { ne, nc } = spellPair(61, iv('4A'), 'asc');
    expect(ne.text).toBe('D♭4');
    expect(nc.text).toBe('G4');
  });

  it('9m au-dessus de A♭4 : respelle NE en G♯4 → A5', () => {
    const { ne, nc } = spellPair(68, iv('9m'), 'asc');
    expect(ne.text).toBe('G♯4');
    expect(nc.text).toBe('A5');
  });

  it('4A au-dessus de F♯4 : préfère G♭4 → C5 (moins d’altérations)', () => {
    const { ne, nc } = spellPair(66, iv('4A'), 'asc');
    expect(ne.text).toBe('G♭4');
    expect(nc.text).toBe('C5');
  });

  it('4A au-dessus de B3 → E♯4 (altération simple imposée par la théorie)', () => {
    expect(spellPair(59, iv('4A'), 'asc').nc.text).toBe('E♯4');
  });

  it('descendant : 5↓ depuis C4 → F3', () => {
    expect(spellPair(60, iv('5'), 'desc').nc.text).toBe('F3');
  });

  it('exhaustif 12 pc × 28 paires : jamais de double altération, lettre correcte', () => {
    for (let midi = 48; midi < 60; midi++) {
      for (const def of INTERVALS) {
        for (const dir of ['asc', 'desc'] as const) {
          const { ne, nc } = spellPair(midi, def, dir);
          expect(Math.abs(ne.acc)).toBeLessThanOrEqual(1);
          expect(Math.abs(nc.acc)).toBeLessThanOrEqual(1);
          expect(ne.midi).toBe(midi);
          expect(nc.midi).toBe(dir === 'asc' ? midi + def.semitones : midi - def.semitones);
          const nePos = ne.octave * 7 + LETTERS.indexOf(ne.letter);
          const ncPos = nc.octave * 7 + LETTERS.indexOf(nc.letter);
          expect(ncPos - nePos).toBe(dir === 'asc' ? def.degree - 1 : -(def.degree - 1));
        }
      }
    }
  });
});

describe('spellMidi', () => {
  it('table par défaut (goût jazz)', () => {
    expect(spellMidi(60).text).toBe('C4');
    expect(spellMidi(61).text).toBe('D♭4');
    expect(spellMidi(66).text).toBe('F♯4');
    expect(spellMidi(70).text).toBe('B♭4');
    expect(spellMidi(36).text).toBe('C2');
  });
});
