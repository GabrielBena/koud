// Sélecteur d'ambitus (réglages) : toucher une note l'auditionne ; la
// puce armée (« grave » ou « aiguë ») capte la prochaine note validée.

import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { isBlackKey } from '../lib/keyboardLayout';
import { spellMidi } from '../lib/theory';
import { Keyboard } from './Keyboard';

const FROM = 36; // C2
const TO = 96; // C7
/** Largeur des blanches du sélecteur : ≥38 px pour les pouces. */
export const PICKER_WHITE_W = 38;

export function whiteIndexOf(midi: number, from = FROM): number {
  let idx = 0;
  for (let m = from; m < midi; m++) if (!isBlackKey(m)) idx++;
  return idx;
}

export interface RangePickerProps {
  low: number;
  high: number;
  onChange(low: number, high: number): void;
}

export function RangePicker({ low, high, onChange }: RangePickerProps) {
  const [armed, setArmed] = useState<'low' | 'high'>('low');
  const [msg, setMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      const center = whiteIndexOf(Math.round((low + high) / 2)) * PICKER_WHITE_W;
      el.scrollLeft = Math.max(0, center - el.clientWidth / 2);
    }
    return () => {
      if (msgTimer.current) clearTimeout(msgTimer.current);
    };
    // centrage uniquement à l'ouverture
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (text: string) => {
    setMsg(text);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(''), 2500);
  };

  const commit = (midi: number) => {
    if (armed === 'low') {
      if (midi >= high) {
        flash('La note grave doit rester sous la note aiguë.');
        return;
      }
      onChange(midi, high);
    } else {
      if (midi <= low) {
        flash('La note aiguë doit rester au-dessus de la grave.');
        return;
      }
      onChange(low, midi);
    }
  };

  return (
    <div className="range-picker">
      <div className="chips">
        <button
          type="button"
          className={`chip${armed === 'low' ? ' chip--armed' : ''}`}
          onClick={() => setArmed('low')}
        >
          Note grave <b>{spellMidi(low).text}</b>
        </button>
        <button
          type="button"
          className={`chip${armed === 'high' ? ' chip--armed' : ''}`}
          onClick={() => setArmed('high')}
        >
          Note aiguë <b>{spellMidi(high).text}</b>
        </button>
      </div>
      <div className="keys-scroll" ref={scrollRef}>
        <Keyboard
          from={FROM}
          to={TO}
          whiteWidth={PICKER_WHITE_W}
          whiteHeight={150}
          labelCs
          highlights={{ [low]: 'var(--green)', [high]: 'var(--green)' }}
          shade={[low, high]}
          onKeyPress={(midi) => audio.playNote(midi)}
          onKeyCommit={commit}
        />
      </div>
      <div className="picker-msg" role="status">
        {msg}
      </div>
    </div>
  );
}
