// Détection de hauteur (YIN, de Cheveigné & Kawahara 2002) — pur, sans
// dépendance, testé sur signaux synthétiques. Utilisé par la détection
// d'ambitus au micro ; conçu pour une voix seule.
//
// Avantage maison : on ne détecte jamais « en aveugle » — l'appelant
// contraint [fMin, fMax] à la plage vocale attendue, ce qui élimine
// l'essentiel des erreurs d'octave classiques de YIN.

export interface PitchOptions {
  /** Hz — défaut 55 (sous le A1) */
  fMin?: number;
  /** Hz — défaut 1100 (au-dessus du C6) */
  fMax?: number;
  /** Seuil YIN sur d′(τ) — défaut 0.12 */
  threshold?: number;
}

export interface PitchResult {
  f0: number;
  /** MIDI fractionnaire (69 = A4) */
  midi: number;
  /** 1 − d′(τ) : ~0.9+ pour une voix nette, ~0 pour du bruit */
  clarity: number;
}

export function midiFromF0(f0: number): number {
  return 69 + 12 * Math.log2(f0 / 440);
}

/**
 * Analyse une trame (typiquement 4096 échantillons). Renvoie null si rien
 * de suffisamment périodique dans [fMin, fMax] (bruit, silence, consonne).
 */
export function detectPitch(
  buf: Float32Array,
  sampleRate: number,
  opts: PitchOptions = {},
): PitchResult | null {
  const fMin = opts.fMin ?? 55;
  const fMax = opts.fMax ?? 1100;
  const threshold = opts.threshold ?? 0.12;

  const W = Math.floor(buf.length / 2);
  const tauMin = Math.max(2, Math.floor(sampleRate / fMax));
  const tauMax = Math.min(Math.floor(sampleRate / fMin), W);
  if (tauMax <= tauMin) return null;

  // d(τ) pour τ = 1..tauMax (la normalisation cumulative exige tout le préfixe)
  const d = new Float64Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < W; i++) {
      const diff = buf[i] - buf[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }

  // d′(τ) : différence moyenne cumulée normalisée
  const dn = new Float64Array(tauMax + 1);
  dn[0] = 1;
  let cum = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    cum += d[tau];
    dn[tau] = cum === 0 ? 1 : (d[tau] * tau) / cum;
  }

  // Premier franchissement du seuil, poussé jusqu'au minimum local :
  // c'est la règle qui évite de retomber sur une sous-harmonique.
  let tauEst = -1;
  for (let tau = tauMin; tau <= tauMax; tau++) {
    if (dn[tau] < threshold) {
      while (tau + 1 <= tauMax && dn[tau + 1] < dn[tau]) tau++;
      tauEst = tau;
      break;
    }
  }
  if (tauEst === -1) return null;

  // Interpolation parabolique autour de τ pour la précision sub-échantillon
  let tauBetter = tauEst;
  if (tauEst > tauMin && tauEst < tauMax) {
    const s0 = dn[tauEst - 1];
    const s1 = dn[tauEst];
    const s2 = dn[tauEst + 1];
    const denom = s0 - 2 * s1 + s2;
    if (denom !== 0) {
      const offset = (s0 - s2) / (2 * denom);
      if (offset > -1 && offset < 1) tauBetter = tauEst + offset;
    }
  }

  const f0 = sampleRate / tauBetter;
  if (f0 < fMin || f0 > fMax) return null;
  return { f0, midi: midiFromF0(f0), clarity: 1 - dn[tauEst] };
}

export interface CaptureSummary {
  /** Note proposée (MIDI entier) */
  midi: number;
  medianMidiFloat: number;
  /** Écart de la médiane à la note ronde, en cents */
  centsOff: number;
  frames: number;
}

/**
 * Agrège les trames voisées d'une capture en une proposition de note.
 * Médiane (robuste aux trames aberrantes d'octave) + garde-fou d'étalement :
 * un glissando ou une prise instable ne propose rien plutôt que n'importe quoi.
 */
export function summarizeCapture(
  midiFloats: readonly number[],
  minFrames = 15,
  maxIqrSemis = 1.5,
): CaptureSummary | null {
  if (midiFloats.length < minFrames) return null;
  const sorted = [...midiFloats].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const median = q(0.5);
  if (q(0.75) - q(0.25) > maxIqrSemis) return null;
  const midi = Math.round(median);
  return {
    midi,
    medianMidiFloat: median,
    centsOff: Math.round((median - midi) * 100),
    frames: midiFloats.length,
  };
}
