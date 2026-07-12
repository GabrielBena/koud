import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type StorageLike } from './settings';

function fakeStorage(initial: Record<string, string> = {}): StorageLike {
  const mem = new Map(Object.entries(initial));
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => mem.set(k, v),
  };
}

describe('loadSettings', () => {
  it('stockage absent → défauts (copie fraîche, pas de référence partagée)', () => {
    const s = loadSettings(null);
    expect(s).toEqual(DEFAULT_SETTINGS);
    expect(s.pool).not.toBe(DEFAULT_SETTINGS.pool);
    expect(s.pool).toHaveLength(14); // les 14 ascendants
  });

  it('JSON corrompu → défauts sans lever', () => {
    const s = loadSettings(fakeStorage({ 'ci.settings.v1': '{oops' }));
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it('objet partiel → fusion sur les défauts', () => {
    const s = loadSettings(fakeStorage({ 'ci.settings.v1': '{"timbre":"organ"}' }));
    expect(s.timbre).toBe('organ');
    expect(s.pool).toEqual(DEFAULT_SETTINGS.pool);
    expect(s.holdPlays).toBe('nc');
  });

  it('valeurs invalides → assainies une à une', () => {
    const s = loadSettings(
      fakeStorage({
        'ci.settings.v1': JSON.stringify({
          timbre: 'flute',
          pool: ['99:asc', '5:asc', '5:asc', 42, 'junk'],
          vocalLow: 80,
          vocalHigh: 60, // grave ≥ aigu → les deux repartent à null
          holdPlays: 'weird',
          beginnerMode: 'yes',
          showStrip: false,
        }),
      }),
    );
    expect(s.timbre).toBe('piano');
    expect(s.pool).toEqual(['5:asc']);
    expect(s.vocalLow).toBeNull();
    expect(s.vocalHigh).toBeNull();
    expect(s.holdPlays).toBe('nc');
    expect(s.beginnerMode).toBe(false);
    expect(s.showStrip).toBe(false);
  });

  it('MIDI non entier ou hors bornes → null', () => {
    const s = loadSettings(
      fakeStorage({ 'ci.settings.v1': '{"vocalLow":60.5,"vocalHigh":300}' }),
    );
    expect(s.vocalLow).toBeNull();
    expect(s.vocalHigh).toBeNull();
  });
});

describe('saveSettings', () => {
  it('roundtrip save → load', () => {
    const storage = fakeStorage();
    const custom = {
      ...DEFAULT_SETTINGS,
      vocalLow: 45,
      vocalHigh: 64,
      pool: ['10:asc', '7:desc'] as typeof DEFAULT_SETTINGS.pool,
      timbre: 'pad' as const,
      beginnerMode: true,
    };
    saveSettings(custom, storage);
    expect(loadSettings(storage)).toEqual(custom);
  });

  it('stockage qui lève → silencieux', () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('nope');
      },
      setItem: () => {
        throw new Error('nope');
      },
    };
    expect(() => saveSettings(DEFAULT_SETTINGS, throwing)).not.toThrow();
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS);
  });
});
