// Théorie musicale pure : intervalles, noms de notes, orthographe enharmonique.
// Tout le moteur travaille en MIDI (entiers) ; l'orthographe ne sert qu'à l'affichage.

export type Direction = 'asc' | 'desc';
export type Quality = 'm' | 'M' | 'P' | 'A';

export interface IntervalDef {
  /** Taille en demi-tons */
  semitones: number;
  /** Degré diatonique (2 = seconde … 9 = neuvième) */
  degree: number;
  quality: Quality;
  /** Notation de Theo : "2m", "4A", "8"… */
  label: string;
}

export const INTERVALS: readonly IntervalDef[] = [
  { semitones: 1, degree: 2, quality: 'm', label: '2m' },
  { semitones: 2, degree: 2, quality: 'M', label: '2M' },
  { semitones: 3, degree: 3, quality: 'm', label: '3m' },
  { semitones: 4, degree: 3, quality: 'M', label: '3M' },
  { semitones: 5, degree: 4, quality: 'P', label: '4' },
  { semitones: 6, degree: 4, quality: 'A', label: '4A' },
  { semitones: 7, degree: 5, quality: 'P', label: '5' },
  { semitones: 8, degree: 6, quality: 'm', label: '6m' },
  { semitones: 9, degree: 6, quality: 'M', label: '6M' },
  { semitones: 10, degree: 7, quality: 'm', label: '7m' },
  { semitones: 11, degree: 7, quality: 'M', label: '7M' },
  { semitones: 12, degree: 8, quality: 'P', label: '8' },
  { semitones: 13, degree: 9, quality: 'm', label: '9m' },
  { semitones: 14, degree: 9, quality: 'M', label: '9M' },
];

export function intervalBySemitones(s: number): IntervalDef | undefined {
  return INTERVALS.find((d) => d.semitones === s);
}

/** Clé stable pour le stockage : "10:asc" = 7m ascendante. */
export type PairKey = `${number}:${Direction}`;

export interface Pair {
  def: IntervalDef;
  dir: Direction;
}

export function pairKey(def: IntervalDef, dir: Direction): PairKey {
  return `${def.semitones}:${dir}`;
}

export function parsePairKey(key: string): Pair | null {
  const m = /^(\d+):(asc|desc)$/.exec(key);
  if (!m) return null;
  const def = intervalBySemitones(Number(m[1]));
  if (!def) return null;
  return { def, dir: m[2] as Direction };
}

export const ALL_PAIRS: readonly PairKey[] = INTERVALS.flatMap((def) =>
  (['asc', 'desc'] as const).map((dir) => pairKey(def, dir)),
);

export function pairLabel(def: IntervalDef, dir: Direction): string {
  return `${def.label}${dir === 'asc' ? '↑' : '↓'}`;
}

// ---------------------------------------------------------------------------
// Orthographe des notes

export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Acc = -1 | 0 | 1;

export interface Spelled {
  letter: Letter;
  acc: Acc;
  /** Octave en notation scientifique (C4 = 60) */
  octave: number;
  midi: number;
  /** Ex. "E♭4" */
  text: string;
}

const LETTERS: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function accText(acc: Acc): string {
  return acc === -1 ? '♭' : acc === 1 ? '♯' : '';
}

// Orthographe par défaut de chaque classe de hauteur (goût jazz : ♭ sauf F♯).
const DEFAULT_SPELLING: readonly [Letter, Acc][] = [
  ['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0],
  ['F', 1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0],
];

// Jumelle enharmonique des touches noires, essayée quand l'orthographe par
// défaut imposerait un double-dièse / double-bémol à la note d'arrivée.
const TWIN_SPELLING: Partial<Record<number, [Letter, Acc]>> = {
  1: ['C', 1], 3: ['D', 1], 6: ['G', -1], 8: ['G', 1], 10: ['A', 1],
};

function makeSpelled(letter: Letter, acc: Acc, midi: number): Spelled {
  const octave = Math.floor((midi - acc - LETTER_PC[letter]) / 12) - 1;
  return { letter, acc, octave, midi, text: `${letter}${accText(acc)}${octave}` };
}

export function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

/** Orthographe par défaut d'une note isolée (sélecteur d'ambitus, etc.). */
export function spellMidi(midi: number): Spelled {
  const [letter, acc] = DEFAULT_SPELLING[pitchClass(midi)];
  return makeSpelled(letter, acc, midi);
}

/**
 * Orthographie le couple NE → NC selon la qualité de l'intervalle, sans
 * jamais produire de double altération : la lettre de NC est à
 * (degré − 1) lettres de celle de NE, l'altération suit ; si l'orthographe
 * par défaut de NE mène à ±2, on essaie sa jumelle enharmonique.
 * Ex. 4A au-dessus de D♭4 → G4 (et non C♯4 → F𝄪4) ; 7m au-dessus de E5 → D6.
 */
export function spellPair(
  neMidi: number,
  def: IntervalDef,
  dir: Direction,
): { ne: Spelled; nc: Spelled } {
  const ncMidi = dir === 'asc' ? neMidi + def.semitones : neMidi - def.semitones;
  const pc = pitchClass(neMidi);
  const candidates: [Letter, Acc][] = [DEFAULT_SPELLING[pc]];
  const twin = TWIN_SPELLING[pc];
  if (twin) candidates.push(twin);

  let best: { ne: Spelled; nc: Spelled } | null = null;
  let bestScore = Infinity;
  for (const [letter, acc] of candidates) {
    const ne = makeSpelled(letter, acc, neMidi);
    const nePos = ne.octave * 7 + LETTERS.indexOf(letter);
    const ncPos = dir === 'asc' ? nePos + (def.degree - 1) : nePos - (def.degree - 1);
    const ncLetter = LETTERS[((ncPos % 7) + 7) % 7];
    const ncOctave = Math.floor(ncPos / 7);
    const ncAcc = ncMidi - (12 * (ncOctave + 1) + LETTER_PC[ncLetter]);
    if (ncAcc < -1 || ncAcc > 1) continue;
    const score = Math.max(Math.abs(acc), Math.abs(ncAcc)) * 10 + Math.abs(acc) + Math.abs(ncAcc);
    if (score < bestScore) {
      bestScore = score;
      best = { ne, nc: makeSpelled(ncLetter, ncAcc as Acc, ncMidi) };
    }
  }
  // Filet de sécurité théorique — le test exhaustif prouve qu'on n'y passe jamais.
  return best ?? { ne: spellMidi(neMidi), nc: spellMidi(ncMidi) };
}
