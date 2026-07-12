// Clavier SVG partagé : bandeau de visualisation (non interactif) et
// sélecteur d'ambitus (interactif). Interaction : audition au pointerdown,
// sélection validée au pointerup seulement — un défilement horizontal
// déclenche pointercancel et n'engage donc jamais de sélection.

import { useRef } from 'react';
import { layoutKeys } from '../lib/keyboardLayout';

export interface KeyboardProps {
  from: number;
  to: number;
  whiteWidth?: number;
  whiteHeight?: number;
  /** true : le SVG remplit la largeur du conteneur (viewBox) */
  fit?: boolean;
  /** midi → couleur CSS (remplace le fond de la touche) */
  highlights?: Record<number, string>;
  /** plage teintée (ambitus vocal) */
  shade?: [number, number] | null;
  /** audition (pointerdown) */
  onKeyPress?: (midi: number) => void;
  /** sélection (pointerup, uniquement sur vrai tap) */
  onKeyCommit?: (midi: number) => void;
  /** étiquettes C2, C3… sous les do */
  labelCs?: boolean;
}

const SHADE_FILL = 'rgba(34, 197, 94, 0.28)';

export function Keyboard({
  from,
  to,
  whiteWidth = 34,
  whiteHeight = 150,
  fit = false,
  highlights = {},
  shade = null,
  onKeyPress,
  onKeyCommit,
  labelCs = false,
}: KeyboardProps) {
  const { keys, width } = layoutKeys(from, to, whiteWidth, whiteHeight);
  const downMidiRef = useRef<number | null>(null);
  const interactive = Boolean(onKeyPress || onKeyCommit);

  const isShaded = (midi: number) =>
    shade !== null && midi >= Math.min(shade[0], shade[1]) && midi <= Math.max(shade[0], shade[1]);

  const keyRect = (k: (typeof keys)[number]) => {
    const fill = highlights[k.midi] ?? (k.isBlack ? 'var(--key-black)' : 'var(--key-white)');
    const common = {
      x: k.x,
      y: 0,
      width: k.w,
      height: k.h,
      rx: k.isBlack ? 2 : 3,
    };
    return (
      <g key={k.midi}>
        <rect
          {...common}
          fill={fill}
          stroke="var(--key-line)"
          strokeWidth={1}
          onPointerDown={
            interactive
              ? (e) => {
                  if (e.pointerType === 'mouse' && e.button !== 0) return;
                  downMidiRef.current = k.midi;
                  onKeyPress?.(k.midi);
                }
              : undefined
          }
          onPointerUp={
            interactive
              ? () => {
                  if (downMidiRef.current !== null) onKeyCommit?.(downMidiRef.current);
                  downMidiRef.current = null;
                }
              : undefined
          }
          onPointerCancel={
            interactive
              ? () => {
                  downMidiRef.current = null;
                }
              : undefined
          }
        />
        {isShaded(k.midi) && highlights[k.midi] === undefined && (
          <rect {...common} fill={SHADE_FILL} pointerEvents="none" />
        )}
      </g>
    );
  };

  const whites = keys.filter((k) => !k.isBlack);
  const blacks = keys.filter((k) => k.isBlack);

  return (
    <svg
      className={interactive ? 'kbd kbd--interactive' : 'kbd'}
      {...(fit
        ? { width: '100%', viewBox: `0 0 ${width} ${whiteHeight}`, preserveAspectRatio: 'xMidYMid meet' }
        : { width, height: whiteHeight, viewBox: `0 0 ${width} ${whiteHeight}` })}
      onContextMenu={(e) => e.preventDefault()}
    >
      {whites.map(keyRect)}
      {blacks.map(keyRect)}
      {labelCs &&
        whites
          .filter((k) => k.midi % 12 === 0)
          .map((k) => (
            <text
              key={`label-${k.midi}`}
              x={k.x + k.w / 2}
              y={whiteHeight - 8}
              textAnchor="middle"
              fontSize={11}
              fill="var(--key-label)"
              pointerEvents="none"
            >
              C{Math.floor(k.midi / 12) - 1}
            </text>
          ))}
    </svg>
  );
}
