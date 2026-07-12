// Réglages persistés (localStorage), avec fusion validée : une valeur
// corrompue ou inconnue retombe silencieusement sur le défaut.

import { ALL_PAIRS, INTERVALS, pairKey, type PairKey } from '../lib/theory';

export type TimbreId = 'piano' | 'organ' | 'pad';
export type HoldPlays = 'nc' | 'ne-then-nc';

export interface Settings {
  schema: 1;
  /** MIDI, null tant que l'assistant de 1er lancement n'est pas passé */
  vocalLow: number | null;
  vocalHigh: number | null;
  pool: PairKey[];
  timbre: TimbreId;
  beginnerMode: boolean;
  holdPlays: HoldPlays;
  showStrip: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  schema: 1,
  vocalLow: null,
  vocalHigh: null,
  // Défaut : tous les intervalles ascendants (les 28 d'un coup, c'est le chaos)
  pool: INTERVALS.map((d) => pairKey(d, 'asc')),
  timbre: 'piano',
  beginnerMode: false,
  holdPlays: 'nc',
  showStrip: true,
};

const KEY = 'ci.settings.v1';
const MIDI_MIN = 24; // C1
const MIDI_MAX = 108; // C8

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function sanitizeMidi(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= MIDI_MIN && v <= MIDI_MAX
    ? v
    : null;
}

export function loadSettings(storage: StorageLike | null = defaultStorage()): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS, pool: [...DEFAULT_SETTINGS.pool] };
  let raw: unknown;
  try {
    const text = storage?.getItem(KEY);
    if (!text) return out;
    raw = JSON.parse(text);
  } catch {
    return out;
  }
  if (typeof raw !== 'object' || raw === null) return out;
  const r = raw as Record<string, unknown>;

  out.vocalLow = sanitizeMidi(r.vocalLow);
  out.vocalHigh = sanitizeMidi(r.vocalHigh);
  if (out.vocalLow !== null && out.vocalHigh !== null && out.vocalLow >= out.vocalHigh) {
    out.vocalLow = null;
    out.vocalHigh = null;
  }
  if (Array.isArray(r.pool)) {
    out.pool = [...new Set(r.pool.filter(
      (k): k is PairKey => typeof k === 'string' && (ALL_PAIRS as readonly string[]).includes(k),
    ))];
  }
  if (r.timbre === 'piano' || r.timbre === 'organ' || r.timbre === 'pad') out.timbre = r.timbre;
  if (typeof r.beginnerMode === 'boolean') out.beginnerMode = r.beginnerMode;
  if (r.holdPlays === 'nc' || r.holdPlays === 'ne-then-nc') out.holdPlays = r.holdPlays;
  if (typeof r.showStrip === 'boolean') out.showStrip = r.showStrip;
  return out;
}

export function saveSettings(s: Settings, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(s));
  } catch {
    // stockage indisponible (navigation privée…) : on vit en mémoire
  }
}
