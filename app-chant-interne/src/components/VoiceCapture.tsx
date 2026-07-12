// Détection d'ambitus au micro (v2.0) — strictement optionnelle : un bouton
// 🎤 à côté du clavier, le parcours manuel reste le défaut. L'humain garde
// le dernier mot : on propose la note entendue, l'utilisateur confirme.
// La voix ne quitte jamais l'appareil.

import { useEffect, useRef, useState } from 'react';
import { startMicCapture, type MicSession } from '../audio/mic';
import { detectPitch, summarizeCapture } from '../lib/pitch';
import { spellMidi } from '../lib/theory';

export interface VoiceCaptureProps {
  /** « note grave » / « note aiguë » */
  label: string;
  onUse(midi: number): void;
}

type Phase = 'idle' | 'listening' | 'proposal' | 'error';

const MIN_CLARITY = 0.8;
/** ~1,4 s de son voisé à ~22 trames/s */
const TARGET_FRAMES = 30;
const TIMEOUT_MS = 7000;

export function VoiceCapture({ label, onUse }: VoiceCaptureProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [live, setLive] = useState('…');
  const [proposal, setProposal] = useState<number | null>(null);
  const [error, setError] = useState('');
  const framesRef = useRef<number[]>([]);
  const sessionRef = useRef<MicSession | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  const cleanup = () => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    cleanup();
    const sum = summarizeCapture(framesRef.current);
    if (sum) {
      setProposal(sum.midi);
      setPhase('proposal');
    } else {
      setError('Je n’ai pas bien entendu — réessaie près du micro, en tenant « ooo ».');
      setPhase('error');
    }
  };

  const cancel = () => {
    doneRef.current = true;
    cleanup();
    setPhase('idle');
  };

  useEffect(() => {
    const vis = () => {
      if (document.visibilityState === 'hidden') cancel();
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      cleanup();
    };
    // cancel/cleanup ne lisent que des refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    framesRef.current = [];
    doneRef.current = false;
    setLive('…');
    setPhase('listening');
    try {
      sessionRef.current = await startMicCapture((buf, sampleRate) => {
        const r = detectPitch(buf, sampleRate, { fMin: 55, fMax: 1100 });
        if (r && r.clarity >= MIN_CLARITY) {
          framesRef.current.push(r.midi);
          setLive(spellMidi(Math.round(r.midi)).text);
          if (framesRef.current.length >= TARGET_FRAMES) finish();
        } else {
          setLive('…');
        }
      });
      timerRef.current = setTimeout(finish, TIMEOUT_MS);
    } catch {
      cleanup();
      setError('Micro refusé ou indisponible — tu peux toujours choisir la note sur le clavier.');
      setPhase('error');
    }
  };

  if (phase === 'idle') {
    return (
      <div className="voice-capture">
        <button type="button" className="chip mic-chip" onClick={start}>
          🎤 Chanter la {label}
        </button>
      </div>
    );
  }

  if (phase === 'listening') {
    return (
      <div className="voice-capture voice-live" role="status">
        <span className="mic-pulse" aria-hidden="true">
          🎤
        </span>
        <span>
          Chante « ooo »… <b className="live-note">{live}</b>
        </span>
        <button type="button" className="chip" onClick={finish}>
          OK
        </button>
        <button type="button" className="chip" onClick={cancel} aria-label="Annuler">
          ✕
        </button>
      </div>
    );
  }

  if (phase === 'proposal' && proposal !== null) {
    return (
      <div className="voice-capture voice-live" role="status">
        <span>
          J’ai entendu : <b className="live-note">{spellMidi(proposal).text}</b>
        </span>
        <button
          type="button"
          className="chip chip--armed"
          onClick={() => {
            onUse(proposal);
            setPhase('idle');
          }}
        >
          Utiliser
        </button>
        <button type="button" className="chip" onClick={start}>
          Réessayer
        </button>
        <button type="button" className="chip" onClick={cancel} aria-label="Annuler">
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="voice-capture voice-error" role="status">
      <span>{error}</span>
      <button type="button" className="chip" onClick={start}>
        Réessayer
      </button>
      <button type="button" className="chip" onClick={cancel} aria-label="Fermer">
        ✕
      </button>
    </div>
  );
}
