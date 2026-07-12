// L'écran principal, fidèle au croquis de Theo : engrenage en haut à
// gauche, l'intervalle en énorme au centre (toucher = réécouter NE),
// bandeau clavier optionnel, gros NEXT vert en bas.

import { useMemo, type RefObject } from 'react';
import type { Exercise } from '../lib/exercise';
import { snapToWhite } from '../lib/keyboardLayout';
import { pairLabel, parsePairKey, spellPair } from '../lib/theory';
import type { Settings } from '../state/settings';
import type { HoldHandlers } from './useHold';
import { PianoStrip } from './PianoStrip';

export interface ExerciseScreenProps {
  settings: Settings;
  exercise: Exercise | null;
  holding: boolean;
  holdHandlers: HoldHandlers;
  holdEnabled: boolean;
  nextBtnRef: RefObject<HTMLButtonElement | null>;
  /** Impulsion visuelle brève après un swipe validé */
  flicking: boolean;
  onStart(): void;
  onReplayNe(): void;
  onOpenSettings(): void;
}

export function ExerciseScreen({
  settings,
  exercise,
  holding,
  holdHandlers,
  holdEnabled,
  nextBtnRef,
  flicking,
  onStart,
  onReplayNe,
  onOpenSettings,
}: ExerciseScreenProps) {
  const poolEmpty = settings.pool.length === 0;

  // Fenêtre du bandeau, stable pour toute la session : ambitus vocal
  // élargi du plus grand intervalle du pool dans chaque direction.
  const stripWindow = useMemo(() => {
    if (settings.vocalLow === null || settings.vocalHigh === null) return null;
    let maxAsc = 0;
    let maxDesc = 0;
    for (const key of settings.pool) {
      const p = parsePairKey(key);
      if (!p) continue;
      if (p.dir === 'asc') maxAsc = Math.max(maxAsc, p.def.semitones);
      else maxDesc = Math.max(maxDesc, p.def.semitones);
    }
    return {
      from: snapToWhite(settings.vocalLow - maxAsc, 'down'),
      to: snapToWhite(settings.vocalHigh + maxDesc, 'up'),
    };
  }, [settings.pool, settings.vocalLow, settings.vocalHigh]);

  const spelled = exercise ? spellPair(exercise.ne, exercise.def, exercise.dir) : null;

  return (
    <div className="app">
      <header className="topbar">
        <button
          type="button"
          className="gear-btn"
          onClick={onOpenSettings}
          aria-label="Réglages"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Zm7.4-2.6c.05-.3.08-.6.08-.9s-.03-.6-.08-.9l2-1.6a.5.5 0 0 0 .12-.64l-1.9-3.3a.5.5 0 0 0-.6-.22l-2.4.96a7.3 7.3 0 0 0-1.55-.9l-.36-2.55A.5.5 0 0 0 14.2 2h-3.8a.5.5 0 0 0-.5.42l-.35 2.55c-.56.23-1.08.53-1.56.9l-2.4-.97a.5.5 0 0 0-.6.23l-1.9 3.3a.5.5 0 0 0 .12.63l2 1.6c-.05.3-.08.6-.08.9s.03.6.08.9l-2 1.6a.5.5 0 0 0-.12.64l1.9 3.3c.13.22.4.3.6.22l2.4-.96c.48.37 1 .67 1.56.9l.35 2.55c.04.24.25.42.5.42h3.8c.25 0 .46-.18.5-.42l.36-2.55c.55-.23 1.07-.53 1.55-.9l2.4.96c.23.09.48 0 .6-.22l1.9-3.3a.5.5 0 0 0-.12-.63l-2-1.6Z"
            />
          </svg>
        </button>
        <span className="brand">Chant intérieur</span>
      </header>

      <main className="exercise-main">
        {poolEmpty ? (
          <p className="empty-msg">
            Sélectionne au moins un intervalle dans les réglages pour t’exercer.
          </p>
        ) : exercise === null ? (
          <button type="button" className="big-btn" onClick={onStart}>
            ▶&nbsp;&nbsp;Commencer
          </button>
        ) : (
          <>
            <button
              type="button"
              className="interval-display"
              onClick={onReplayNe}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={`Intervalle ${pairLabel(exercise.def, exercise.dir)} — toucher pour réécouter la note`}
            >
              {pairLabel(exercise.def, exercise.dir)}
              <span className="replay-hint">toucher pour réécouter la note</span>
            </button>
            {settings.showStrip && stripWindow && (
              <div className="strip-zone">
                <PianoStrip
                  from={stripWindow.from}
                  to={stripWindow.to}
                  ne={exercise.ne}
                  nc={holding ? exercise.nc : null}
                  vocalLow={settings.vocalLow!}
                  vocalHigh={settings.vocalHigh!}
                />
                <div className="strip-caption">
                  {holding && spelled ? `${spelled.ne.text} → ${spelled.nc.text}` : ' '}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <button
        type="button"
        ref={nextBtnRef}
        className={`next-btn${holding ? ' next-btn--holding' : ''}${flicking ? ' next-btn--flick' : ''}`}
        disabled={!holdEnabled}
        aria-label="Maintenir pour entendre la note à chanter ; glisser vers le haut pour l'exercice suivant"
        {...holdHandlers}
      >
        <span className="next-chevrons" aria-hidden="true">
          <svg className="chev-float" viewBox="0 0 24 20" width="26" height="22">
            <path
              d="M4 16 L12 9 L20 16"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.5"
            />
            <path
              d="M4 9.5 L12 2.5 L20 9.5"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="next-inner">
          <span className="next-label">NEXT</span>
          <span className="next-hint">
            {holding ? 'glisse ↑ pour le suivant' : 'tenir : écouter · glisser ↑ : suivant'}
          </span>
        </span>
      </button>
    </div>
  );
}
