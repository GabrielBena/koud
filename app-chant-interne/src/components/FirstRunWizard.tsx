// Premier lancement : débloque l'audio (« Commencer » = geste utilisateur
// requis par la politique autoplay) puis fait choisir l'ambitus en deux
// étapes — tout dépend de lui, pas d'échappatoire.

import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { spellMidi } from '../lib/theory';
import { Keyboard } from './Keyboard';
import { PICKER_WHITE_W, whiteIndexOf } from './RangePicker';

const FROM = 36; // C2
const TO = 96; // C7

export interface FirstRunWizardProps {
  onDone(low: number, high: number): void;
}

export function FirstRunWizard({ onDone }: FirstRunWizardProps) {
  const [step, setStep] = useState<'welcome' | 'low' | 'high'>('welcome');
  const [low, setLow] = useState<number | null>(null);
  const [candidate, setCandidate] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && (step === 'low' || step === 'high')) {
      const target = step === 'low' ? 48 : (low ?? 48) + 12; // autour de C3 puis une octave au-dessus de la grave
      el.scrollLeft = Math.max(0, whiteIndexOf(target) * PICKER_WHITE_W - el.clientWidth / 2);
    }
  }, [step, low]);

  const commit = (midi: number) => {
    if (step === 'high' && low !== null && midi <= low) {
      setMsg(`Choisis une note au-dessus de ${spellMidi(low).text}.`);
      return;
    }
    setMsg('');
    setCandidate(midi);
  };

  const validate = () => {
    if (candidate === null) return;
    if (step === 'low') {
      setLow(candidate);
      setCandidate(null);
      setStep('high');
    } else if (low !== null) {
      onDone(low, candidate);
    }
  };

  if (step === 'welcome') {
    return (
      <div className="wizard">
        <div className="wizard-body">
          <h1>Chant intérieur</h1>
          <p>
            Tu entends une note, tu chantes la note à l’intervalle demandé, puis tu tiens{' '}
            <b>NEXT</b> pour vérifier — réécoute autant que tu veux. Glisse vers le haut
            (en tenant) : exercice suivant.
          </p>
          <p>D’abord, réglons ton ambitus de chant.</p>
        </div>
        <button
          type="button"
          className="big-btn"
          onClick={async () => {
            await audio.unlock();
            setStep('low');
          }}
        >
          Commencer
        </button>
      </div>
    );
  }

  const highlights: Record<number, string> = {};
  if (low !== null) highlights[low] = 'var(--green)';
  if (candidate !== null) highlights[candidate] = 'var(--blue)';

  return (
    <div className="wizard">
      <div className="wizard-body">
        <h1>{step === 'low' ? 'Note grave' : 'Note aiguë'}</h1>
        <p>
          {step === 'low'
            ? 'Touche les notes et choisis la plus grave que tu chantes confortablement.'
            : 'Même chose vers le haut : la plus aiguë confortable.'}
        </p>
        <div className="keys-scroll" ref={scrollRef}>
          <Keyboard
            from={FROM}
            to={TO}
            whiteWidth={PICKER_WHITE_W}
            whiteHeight={150}
            labelCs
            highlights={highlights}
            shade={low !== null && candidate !== null ? [low, candidate] : null}
            onKeyPress={(midi) => audio.playNote(midi)}
            onKeyCommit={commit}
          />
        </div>
        <div className="picker-msg" role="status">
          {msg}
        </div>
      </div>
      <button type="button" className="big-btn" disabled={candidate === null} onClick={validate}>
        {candidate === null
          ? 'Touche une note…'
          : `Valider ${spellMidi(candidate).text}`}
      </button>
    </div>
  );
}
