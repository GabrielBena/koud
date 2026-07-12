import { describe, expect, it } from 'vitest';
import { isBlackKey, layoutKeys, snapToWhite } from './keyboardLayout';

describe('isBlackKey / snapToWhite', () => {
  it('classes de hauteur noires', () => {
    expect(isBlackKey(60)).toBe(false); // C4
    expect(isBlackKey(61)).toBe(true); // C♯4
    expect(isBlackKey(64)).toBe(false); // E4
    expect(isBlackKey(70)).toBe(true); // B♭4
  });
  it('snap vers la blanche voisine', () => {
    expect(snapToWhite(37, 'down')).toBe(36);
    expect(snapToWhite(37, 'up')).toBe(38);
    expect(snapToWhite(40, 'down')).toBe(40); // déjà blanche
  });
});

describe('layoutKeys', () => {
  const W = 30;
  const H = 120;

  it('C2–C7 : 36 blanches, largeur totale 36 × W', () => {
    const { keys, width } = layoutKeys(36, 96, W, H);
    const whites = keys.filter((k) => !k.isBlack);
    expect(whites).toHaveLength(36);
    expect(width).toBe(36 * W);
    expect(keys).toHaveLength(96 - 36 + 1);
  });

  it('chaque noire est strictement à l’intérieur de ses deux blanches voisines', () => {
    const { keys } = layoutKeys(36, 96, W, H);
    const byMidi = new Map(keys.map((k) => [k.midi, k]));
    for (const k of keys.filter((k) => k.isBlack)) {
      const left = byMidi.get(k.midi - 1)!;
      const right = byMidi.get(k.midi + 1)!;
      expect(left.isBlack).toBe(false);
      expect(right.isBlack).toBe(false);
      expect(k.x).toBeGreaterThan(left.x);
      expect(k.x + k.w).toBeLessThan(right.x + right.w);
      expect(k.h).toBeLessThan(H);
    }
  });

  it('les blanches se suivent sans trou ni chevauchement', () => {
    const { keys } = layoutKeys(36, 96, W, H);
    const whites = keys.filter((k) => !k.isBlack);
    whites.forEach((k, i) => expect(k.x).toBe(i * W));
  });
});
