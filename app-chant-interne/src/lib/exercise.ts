// Le cœur de la spec de Theo : l'ambitus « d'écoute » est l'ambitus de chant
// translaté de l'intervalle (vers le bas si ascendant, vers le haut si
// descendant), de sorte que la note à chanter (NC) tombe toujours dans la voix.

import type { Direction, IntervalDef } from './theory';

export interface Exercise {
  def: IntervalDef;
  dir: Direction;
  /** Note d'écoute (MIDI) — jouée, pas forcément chantable */
  ne: number;
  /** Note de chant (MIDI) — toujours dans l'ambitus vocal */
  nc: number;
}

export type Rand = () => number;

export function listeningRange(
  vocalLow: number,
  vocalHigh: number,
  semitones: number,
  dir: Direction,
): [number, number] {
  return dir === 'asc'
    ? [vocalLow - semitones, vocalHigh - semitones]
    : [vocalLow + semitones, vocalHigh + semitones];
}

/** Tirage uniforme dans [lo, hi], en excluant prevNe quand c'est possible. */
export function drawNE(
  [lo, hi]: [number, number],
  prevNe: number | null,
  rand: Rand,
): number {
  const width = hi - lo + 1;
  if (width > 1 && prevNe !== null && prevNe >= lo && prevNe <= hi) {
    const idx = Math.min(width - 2, Math.floor(rand() * (width - 1)));
    const v = lo + idx;
    return v >= prevNe ? v + 1 : v;
  }
  return lo + Math.min(width - 1, Math.floor(rand() * width));
}

export function drawExercise(
  vocalLow: number,
  vocalHigh: number,
  def: IntervalDef,
  dir: Direction,
  prevNe: number | null,
  rand: Rand = Math.random,
): Exercise {
  const range = listeningRange(vocalLow, vocalHigh, def.semitones, dir);
  const ne = drawNE(range, prevNe, rand);
  const nc = dir === 'asc' ? ne + def.semitones : ne - def.semitones;
  return { def, dir, ne, nc };
}
