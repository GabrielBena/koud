// « Giga bonus » : débuts d'airs célèbres dont le PREMIER saut mélodique est
// exactement l'intervalle travaillé. Transposés pour démarrer sur NE, le saut
// atterrit donc sur NC.
//
// `verified: false` = encodage à faire valider par Theo avant d'être joué :
// ces entrées restent inertes (findHook les ignore) mais passent quand même
// le test d'intégrité (premier saut = bon intervalle signé).

import type { PairKey } from './theory';

export interface SongHook {
  pair: PairKey;
  title: string;
  bpm: number;
  verified: boolean;
  /** [demi-tons depuis la 1re note, départ en temps, durée en temps] */
  notes: readonly [number, number, number][];
}

export const SONG_HOOKS: readonly SongHook[] = [
  // --- Vérifiés (saut initial certain, suite fidèle à l'air) ---
  {
    pair: '1:asc', title: 'Les Dents de la mer', bpm: 100, verified: true,
    notes: [[0, 0, 0.75], [1, 0.75, 0.75], [0, 1.5, 0.5], [1, 2, 0.5], [0, 2.5, 0.25], [1, 2.75, 0.25]],
  },
  {
    pair: '1:desc', title: 'La Lettre à Élise', bpm: 120, verified: true,
    notes: [[0, 0, 0.5], [-1, 0.5, 0.5], [0, 1, 0.5], [-1, 1.5, 0.5], [0, 2, 0.5], [-5, 2.5, 0.5], [-2, 3, 0.5], [-4, 3.5, 0.5], [-7, 4, 1.5]],
  },
  {
    pair: '2:asc', title: 'Frère Jacques', bpm: 120, verified: true,
    notes: [[0, 0, 1], [2, 1, 1], [4, 2, 1], [0, 3, 1], [0, 4, 1], [2, 5, 1], [4, 6, 1], [0, 7, 1]],
  },
  {
    pair: '3:asc', title: 'Greensleeves', bpm: 100, verified: true,
    notes: [[0, 0, 1], [3, 1, 2], [5, 3, 1], [7, 4, 1.5], [8, 5.5, 0.5], [7, 6, 1]],
  },
  {
    pair: '3:desc', title: 'Hey Jude', bpm: 90, verified: true,
    notes: [[0, 0, 1], [-3, 1, 2], [-3, 3, 0.5], [0, 3.5, 0.5], [2, 4, 1], [-7, 5, 2]],
  },
  {
    pair: '4:asc', title: 'When the Saints', bpm: 120, verified: true,
    notes: [[0, 0, 0.5], [4, 0.5, 0.5], [5, 1, 0.5], [7, 1.5, 2.5], [0, 4.5, 0.5], [4, 5, 0.5], [5, 5.5, 0.5], [7, 6, 2]],
  },
  {
    pair: '4:desc', title: '5e Symphonie de Beethoven', bpm: 108, verified: true,
    notes: [[0, 0, 0.5], [0, 0.5, 0.5], [0, 1, 0.5], [-4, 1.5, 3], [-2, 5, 0.5], [-2, 5.5, 0.5], [-2, 6, 0.5], [-5, 6.5, 3]],
  },
  {
    pair: '5:asc', title: 'La Marseillaise', bpm: 104, verified: true,
    notes: [[0, 0, 0.75], [0, 0.75, 0.25], [0, 1, 1], [5, 2, 1], [5, 3, 1], [7, 4, 1], [7, 5, 1], [12, 6, 1.5]],
  },
  {
    pair: '5:desc', title: 'Petite musique de nuit (Mozart)', bpm: 130, verified: true,
    notes: [[0, 0, 1], [-5, 1, 1], [0, 2, 1], [-5, 3, 1], [0, 4, 0.5], [-5, 4.5, 0.5], [0, 5, 0.5], [4, 5.5, 0.5], [7, 6, 1]],
  },
  {
    pair: '6:asc', title: 'Maria (West Side Story)', bpm: 92, verified: true,
    notes: [[0, 0, 0.66], [6, 0.66, 0.34], [7, 1, 2]],
  },
  {
    pair: '7:asc', title: 'Ah ! vous dirai-je, maman', bpm: 100, verified: true,
    notes: [[0, 0, 1], [0, 1, 1], [7, 2, 1], [7, 3, 1], [9, 4, 1], [9, 5, 1], [7, 6, 2]],
  },
  {
    pair: '9:asc', title: 'My Bonnie', bpm: 96, verified: true,
    notes: [[0, 0, 1], [9, 1, 1.5], [7, 2.5, 0.5], [9, 3, 2]],
  },
  {
    pair: '10:asc', title: 'Somewhere (West Side Story)', bpm: 76, verified: true,
    notes: [[0, 0, 1], [10, 1, 2], [9, 3, 1], [5, 4, 2]],
  },
  {
    pair: '12:asc', title: 'Over the Rainbow', bpm: 84, verified: true,
    notes: [[0, 0, 2], [12, 2, 2], [11, 4, 1], [7, 5, 0.5], [9, 5.5, 0.5], [11, 6, 1], [12, 7, 1]],
  },

  // --- À valider avec Theo (inertes tant que verified: false) ---
  {
    pair: '2:desc', title: 'Yesterday', bpm: 80, verified: false,
    notes: [[0, 0, 0.75], [-2, 0.75, 0.25], [-2, 1, 2]],
  },
  {
    pair: '8:asc', title: 'Manhã de Carnaval', bpm: 88, verified: false,
    notes: [[0, 0, 1], [8, 1, 2], [7, 3, 1]],
  },
  {
    pair: '8:desc', title: 'Love Story (Where Do I Begin)', bpm: 88, verified: false,
    notes: [[0, 0, 1], [-8, 1, 2], [-7, 3, 1]],
  },
  {
    pair: '9:desc', title: 'Nobody Knows the Trouble', bpm: 90, verified: false,
    notes: [[0, 0, 1], [-9, 1, 2]],
  },
  {
    pair: '10:desc', title: 'Watermelon Man', bpm: 110, verified: false,
    notes: [[0, 0, 1], [-10, 1, 2]],
  },
  {
    pair: '11:asc', title: 'Take On Me (refrain)', bpm: 120, verified: false,
    notes: [[0, 0, 0.5], [11, 0.5, 1.5]],
  },
  {
    pair: '12:desc', title: 'Willow Weep for Me', bpm: 72, verified: false,
    notes: [[0, 0, 1], [-12, 1, 2]],
  },
  // Sans hook connu fiable : 4A↓, 7M↓, 9m/9M — repli sur la lecture normale de NC.
];

/** Ne renvoie que les hooks validés par le musicien. */
export function findHook(pair: PairKey): SongHook | undefined {
  return SONG_HOOKS.find((h) => h.pair === pair && h.verified);
}

export interface HookNote {
  midi: number;
  /** secondes */
  at: number;
  /** secondes */
  dur: number;
}

export function transposeHook(hook: SongHook, neMidi: number): HookNote[] {
  const spb = 60 / hook.bpm;
  return hook.notes.map(([semis, at, dur]) => ({
    midi: neMidi + semis,
    at: at * spb,
    dur: Math.max(0.05, dur * spb),
  }));
}

/** Premier écart non nul — l'intervalle que le hook fait entendre. */
export function hookFirstLeap(hook: SongHook): number | undefined {
  return hook.notes.map(([s]) => s).find((s) => s !== 0);
}
