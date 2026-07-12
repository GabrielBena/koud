// Moteur audio singleton. Règles :
//  - lookAhead abaissé à 20 ms (les 100 ms par défaut de Tone rendent le
//    bouton NEXT pâteux) ;
//  - Tone.start() rappelé au début de CHAQUE chemin de lecture (la politique
//    autoplay d'Android Chrome peut suspendre le contexte à tout moment) ;
//  - jamais de lecture déclenchée depuis un useEffect React (StrictMode).

import * as Tone from 'tone';
import {
  createOrgan,
  createPad,
  createPiano,
  ONE_SHOT_DUR,
  type Playable,
} from './instruments';
import type { TimbreId } from '../state/settings';

export type LoadState = 'loading' | 'ready';

export interface HoldHandle {
  release(): void;
}

export interface SeqEvent {
  midi: number;
  /** secondes */
  at: number;
  /** secondes */
  dur: number;
}

class AudioEngine {
  private initialized = false;
  private timbre: TimbreId = 'piano';
  private pianoReady = false;
  private listeners = new Set<() => void>();
  private instruments: Record<TimbreId, Playable> | null = null;
  private held: { inst: Playable; freq: number }[] = [];
  private seqTimeouts = new Set<ReturnType<typeof setTimeout>>();
  private lastOneShot: { inst: Playable; freq: number } | null = null;

  /** Crée les instruments et lance le fetch/décodage des échantillons.
   *  Idempotent ; sûr avant tout geste utilisateur (contexte suspendu). */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    Tone.getContext().lookAhead = 0.02;
    const master = new Tone.Gain(0.8);
    const limiter = new Tone.Limiter(-1);
    master.connect(limiter);
    limiter.toDestination();
    const piano = createPiano(() => {
      this.pianoReady = true;
      this.emit();
    });
    const organ = createOrgan();
    const pad = createPad();
    piano.connect(master);
    organ.connect(master);
    pad.output.connect(master);
    this.instruments = { piano, organ, pad: pad.synth };
  }

  /** À appeler dans un geste utilisateur (politique autoplay). Idempotent. */
  async unlock(): Promise<void> {
    this.init();
    await Tone.start();
  }

  loadState(): LoadState {
    return this.pianoReady ? 'ready' : 'loading';
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(): void {
    for (const cb of this.listeners) cb();
  }

  setTimbre(t: TimbreId): void {
    this.timbre = t;
  }

  /** Piano pas encore décodé → repli silencieux sur l'orgue. */
  private current(): { inst: Playable; timbre: TimbreId } {
    this.init();
    const t: TimbreId = this.timbre === 'piano' && !this.pianoReady ? 'organ' : this.timbre;
    return { inst: this.instruments![t], timbre: t };
  }

  private static freq(midi: number): number {
    return Tone.Frequency(midi, 'midi').toFrequency();
  }

  /** One-shot (NE, touches du sélecteur). Relâche le one-shot précédent. */
  playNote(midi: number): void {
    void Tone.start();
    const { inst, timbre } = this.current();
    if (this.lastOneShot) {
      try {
        this.lastOneShot.inst.triggerRelease(this.lastOneShot.freq);
      } catch {
        // note déjà éteinte
      }
    }
    const f = AudioEngine.freq(midi);
    inst.triggerAttackRelease(f, ONE_SHOT_DUR[timbre]);
    this.lastOneShot = { inst, freq: f };
  }

  /** Tenue : attaque maintenant, relâche au release() (bouton NEXT). */
  holdNote(midi: number): HoldHandle {
    void Tone.start();
    const { inst } = this.current();
    const f = AudioEngine.freq(midi);
    inst.triggerAttack(f);
    const entry = { inst, freq: f };
    this.held.push(entry);
    return { release: () => this.releaseHeld(entry) };
  }

  private releaseHeld(entry: { inst: Playable; freq: number }): void {
    const i = this.held.indexOf(entry);
    if (i === -1) return;
    this.held.splice(i, 1);
    try {
      entry.inst.triggerRelease(entry.freq);
    } catch {
      // note déjà éteinte
    }
  }

  /** Séquence (hooks du mode débutant, option « NE puis NC »).
   *  setTimeout par note : 1–10 ms de gigue, sans importance ici,
   *  et release() coupe net tout ce qui reste. */
  holdSequence(events: SeqEvent[]): HoldHandle {
    void Tone.start();
    const { inst } = this.current();
    const timeouts = events.map((ev) => {
      const id = setTimeout(() => {
        this.seqTimeouts.delete(id);
        inst.triggerAttackRelease(AudioEngine.freq(ev.midi), ev.dur);
      }, ev.at * 1000);
      this.seqTimeouts.add(id);
      return id;
    });
    return {
      release: () => {
        for (const id of timeouts) {
          clearTimeout(id);
          this.seqTimeouts.delete(id);
        }
        this.releaseAllOn(inst);
      },
    };
  }

  private releaseAllOn(inst: Playable): void {
    try {
      inst.releaseAll();
    } catch {
      // rien ne sonnait
    }
  }

  /** Coupe tout : appelé avant chaque nouvel exercice et à l'abandon. */
  stopAll(): void {
    if (!this.initialized || !this.instruments) return;
    for (const id of this.seqTimeouts) clearTimeout(id);
    this.seqTimeouts.clear();
    for (const t of ['piano', 'organ', 'pad'] as const) this.releaseAllOn(this.instruments[t]);
    this.held = [];
    this.lastOneShot = null;
  }
}

export const audio = new AudioEngine();
