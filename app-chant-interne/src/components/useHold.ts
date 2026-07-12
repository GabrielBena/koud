// Machine à états du bouton NEXT (spec de Theo : tenir = entendre NC,
// lâcher = exercice suivant). Pointer Events + capture : le relâchement
// compte même si le doigt a glissé hors du bouton. pointercancel /
// perte de capture / passage en arrière-plan = ABANDON : on coupe le son
// mais on n'avance PAS (un appel entrant ne doit pas sauter un exercice).

import { useCallback, useEffect, useRef, useState } from 'react';
import type * as React from 'react';

export interface UseHoldOptions {
  enabled: boolean;
  onHoldStart(): void;
  onHoldRelease(): void;
  onHoldAbort(): void;
}

export interface HoldHandlers {
  onPointerDown(e: React.PointerEvent<HTMLElement>): void;
  onPointerUp(e: React.PointerEvent<HTMLElement>): void;
  onPointerCancel(e: React.PointerEvent<HTMLElement>): void;
  onLostPointerCapture(e: React.PointerEvent<HTMLElement>): void;
  onContextMenu(e: React.MouseEvent): void;
}

type HoldId = number | 'space';

export function useHold(opts: UseHoldOptions): { holding: boolean; handlers: HoldHandlers } {
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });
  const activeRef = useRef<HoldId | null>(null);
  const [holding, setHolding] = useState(false);

  const start = useCallback((id: HoldId): boolean => {
    if (activeRef.current !== null || !optsRef.current.enabled) return false;
    activeRef.current = id;
    setHolding(true);
    optsRef.current.onHoldStart();
    return true;
  }, []);

  const end = useCallback((id: HoldId, aborted: boolean): void => {
    if (activeRef.current !== id) return;
    activeRef.current = null;
    setHolding(false);
    if (aborted) optsRef.current.onHoldAbort();
    else optsRef.current.onHoldRelease();
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      start('space');
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      end('space', false);
    };
    const vis = () => {
      if (document.visibilityState === 'hidden' && activeRef.current !== null) {
        end(activeRef.current, true);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      document.removeEventListener('visibilitychange', vis);
      if (activeRef.current !== null) end(activeRef.current, true);
    };
  }, [start, end]);

  const handlers: HoldHandlers = {
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (start(e.pointerId)) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // capture indisponible : le pointerup au même endroit suffira
        }
      }
    },
    onPointerUp: (e) => end(e.pointerId, false),
    onPointerCancel: (e) => end(e.pointerId, true),
    // Après un pointerup normal, activeRef est déjà null → no-op.
    onLostPointerCapture: (e) => end(e.pointerId, true),
    onContextMenu: (e) => e.preventDefault(),
  };

  return { holding, handlers };
}
