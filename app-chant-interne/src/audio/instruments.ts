import * as Tone from 'tone';
import type { TimbreId } from '../state/settings';

export type Playable = Tone.Sampler | Tone.PolySynth;

// 30 échantillons Salamander (grille de tierces mineures A0→C8) :
// décalage max de ±1–2 demi-tons, transparent à l'oreille.
export const PIANO_SAMPLE_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = { A0: 'A0.mp3', C8: 'C8.mp3' };
  for (let o = 1; o <= 7; o++) {
    map[`C${o}`] = `C${o}.mp3`;
    map[`D#${o}`] = `Ds${o}.mp3`;
    map[`F#${o}`] = `Fs${o}.mp3`;
    map[`A${o}`] = `A${o}.mp3`;
  }
  return map;
})();

export function createPiano(onload: () => void): Tone.Sampler {
  return new Tone.Sampler({
    urls: PIANO_SAMPLE_MAP,
    baseUrl: `${import.meta.env.BASE_URL}samples/piano/`,
    attack: 0,
    release: 0.6,
    onload,
  });
}

// « Orgue doux » : tenue infinie pour s'accorder dessus en chantant ;
// harmoniques 2–4 pour que les notes graves restent audibles sur
// haut-parleur de téléphone (qui coupe sous ~200 Hz).
export function createOrgan(): Tone.PolySynth {
  return new Tone.PolySynth({
    maxPolyphony: 8,
    voice: Tone.Synth,
    options: {
      oscillator: { type: 'custom', partials: [1, 0.4, 0.2, 0.1] },
      envelope: { attack: 0.05, decay: 0, sustain: 1, release: 0.25 },
    },
  });
}

// « Nappe » : spread léger (8 cents) pour garder un centre de hauteur net.
export function createPad(): { synth: Tone.PolySynth; output: Tone.ToneAudioNode } {
  const synth = new Tone.PolySynth({
    maxPolyphony: 8,
    voice: Tone.Synth,
    options: {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 8 },
      envelope: { attack: 0.15, decay: 0.2, sustain: 0.8, release: 0.5 },
    },
  });
  const output = new Tone.Filter(1200, 'lowpass');
  synth.connect(output);
  return { synth, output };
}

/** Durée de la note d'écoute (one-shot), par timbre. */
export const ONE_SHOT_DUR: Record<TimbreId, number> = { piano: 2.0, organ: 1.2, pad: 1.2 };
