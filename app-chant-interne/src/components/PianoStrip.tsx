// Bandeau clavier de l'exercice : fenêtre FIXE pour la session
// (ambitus vocal ± plus grand intervalle du pool), NE en bleu dès le
// début, NC en rouge seulement pendant la tenue de NEXT.

import { Keyboard } from './Keyboard';

export interface PianoStripProps {
  /** bornes déjà alignées sur des touches blanches */
  from: number;
  to: number;
  ne: number;
  /** null tant que NEXT n'est pas tenu */
  nc: number | null;
  vocalLow: number;
  vocalHigh: number;
}

export function PianoStrip({ from, to, ne, nc, vocalLow, vocalHigh }: PianoStripProps) {
  const highlights: Record<number, string> = { [ne]: 'var(--ne)' };
  if (nc !== null) highlights[nc] = 'var(--nc)';
  return (
    <div className="strip">
      <Keyboard
        fit
        from={from}
        to={to}
        whiteWidth={20}
        whiteHeight={92}
        highlights={highlights}
        shade={[vocalLow, vocalHigh]}
      />
    </div>
  );
}
