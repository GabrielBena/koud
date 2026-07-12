// Machine à états du bouton NEXT — v1.1 après essais sur téléphone :
// TENIR = entendre la note à chanter (relâcher revient au même exercice,
// on réécoute autant qu'on veut) ; GLISSER VERS LE HAUT pendant la tenue =
// exercice suivant. Le swipe est un geste délibéré : fini les avancées
// accidentelles, et la réécoute devient le défaut.
// Interruption (appel entrant, écran verrouillé, geste volé par le
// navigateur) = comme un relâcher : le son se coupe, on reste.

import { useCallback, useEffect, useRef, useState } from 'react';
import type * as React from 'react';

export interface UseHoldOptions {
  enabled: boolean;
  onHoldStart(): void;
  /** Relâché ou interrompu : couper le son, rester sur l'exercice. */
  onHoldEnd(): void;
  /** Swipe ↑ en tenant (ou ↑ / N / Entrée au clavier) : exercice suivant. */
  onNext(): void;
  /** Progression du swipe, 0 → 1 (pour l'animation) ; remise à 0 en fin de geste. */
  onDrag?(ratio: number): void;
}

export interface HoldHandlers {
  onPointerDown(e: React.PointerEvent<HTMLElement>): void;
  onPointerMove(e: React.PointerEvent<HTMLElement>): void;
  onPointerUp(e: React.PointerEvent<HTMLElement>): void;
  onPointerCancel(e: React.PointerEvent<HTMLElement>): void;
  onLostPointerCapture(e: React.PointerEvent<HTMLElement>): void;
  onContextMenu(e: React.MouseEvent): void;
}

type HoldId = number | 'space';

/** Distance verticale (px) qui valide le swipe-suivant : assez pour ne pas
 *  partir sur un tremblement de pouce, assez court pour rester un flick. */
const SWIPE_PX = 70;

export function useHold(opts: UseHoldOptions): { holding: boolean; handlers: HoldHandlers } {
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });
  const activeRef = useRef<HoldId | null>(null);
  const startYRef = useRef(0);
  const [holding, setHolding] = useState(false);

  const start = useCallback((id: HoldId, y: number): boolean => {
    if (activeRef.current !== null || !optsRef.current.enabled) return false;
    activeRef.current = id;
    startYRef.current = y;
    setHolding(true);
    optsRef.current.onDrag?.(0);
    optsRef.current.onHoldStart();
    return true;
  }, []);

  const end = useCallback((id: HoldId): void => {
    if (activeRef.current !== id) return;
    activeRef.current = null;
    setHolding(false);
    optsRef.current.onDrag?.(0);
    optsRef.current.onHoldEnd();
  }, []);

  const next = useCallback((): void => {
    if (!optsRef.current.enabled) return;
    if (activeRef.current !== null) {
      activeRef.current = null;
      setHolding(false);
    }
    optsRef.current.onDrag?.(0);
    optsRef.current.onNext();
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space') {
        e.preventDefault();
        start('space', 0);
      } else if (e.code === 'ArrowUp' || e.code === 'Enter' || e.code === 'KeyN') {
        e.preventDefault();
        next();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      end('space');
    };
    const vis = () => {
      if (document.visibilityState === 'hidden' && activeRef.current !== null) {
        end(activeRef.current);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      document.removeEventListener('visibilitychange', vis);
      if (activeRef.current !== null) end(activeRef.current);
    };
  }, [start, end, next]);

  const handlers: HoldHandlers = {
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (start(e.pointerId, e.clientY)) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // capture indisponible : le geste marche quand même sur le bouton
        }
      }
    },
    // Grâce à la capture, on suit le doigt même sorti du bouton.
    onPointerMove: (e) => {
      if (activeRef.current !== e.pointerId) return;
      const dy = startYRef.current - e.clientY;
      if (dy > SWIPE_PX) {
        next();
      } else {
        optsRef.current.onDrag?.(Math.max(0, dy / SWIPE_PX));
      }
    },
    onPointerUp: (e) => end(e.pointerId),
    onPointerCancel: (e) => end(e.pointerId),
    // Après un pointerup ou un swipe validé, activeRef est déjà null → no-op.
    onLostPointerCapture: (e) => end(e.pointerId),
    onContextMenu: (e) => e.preventDefault(),
  };

  return { holding, handlers };
}
