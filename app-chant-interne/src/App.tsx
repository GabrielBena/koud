// Orchestration : réglages persistés, session (sac + exercice courant),
// sémantique tenir/lâcher/abandonner, assistant de premier lancement.
// Toute lecture audio part d'un gestionnaire d'événement, jamais d'un effet.

import { useEffect, useRef, useState } from 'react';
import { audio } from './audio/engine';
import { PairBag } from './lib/bag';
import { drawExercise, type Exercise } from './lib/exercise';
import { findHook, transposeHook } from './lib/songBank';
import { pairKey, parsePairKey } from './lib/theory';
import {
  loadSettings,
  saveSettings,
  type Settings,
} from './state/settings';
import { ExerciseScreen } from './components/ExerciseScreen';
import { FirstRunWizard } from './components/FirstRunWizard';
import { SettingsSheet } from './components/SettingsSheet';
import { useHold } from './components/useHold';
import { useWakeLock } from './components/useWakeLock';

export default function App() {
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings());
  const settingsRef = useRef(settings);
  const [exercise, setExerciseState] = useState<Exercise | null>(null);
  const exerciseRef = useRef<Exercise | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetOpenRef = useRef(false);
  const bagRef = useRef<PairBag | null>(null);
  const prevNeRef = useRef<number | null>(null);
  const stopHoldRef = useRef<(() => void) | null>(null);
  const sheetSnapRef = useRef('');

  const patchSettings = (patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettingsState(next);
  };

  const setExercise = (ex: Exercise | null) => {
    exerciseRef.current = ex;
    setExerciseState(ex);
  };

  // Préchargement des échantillons (aucune lecture ici).
  useEffect(() => {
    audio.init();
  }, []);

  useEffect(() => {
    audio.setTimbre(settings.timbre);
  }, [settings.timbre]);

  // Persistance débouncée.
  useEffect(() => {
    const t = setTimeout(() => saveSettings(settingsRef.current), 300);
    return () => clearTimeout(t);
  }, [settings]);

  const advance = () => {
    const s = settingsRef.current;
    if (s.vocalLow === null || s.vocalHigh === null || s.pool.length === 0) {
      setExercise(null);
      return;
    }
    if (!bagRef.current) bagRef.current = new PairBag(s.pool);
    const pair = parsePairKey(bagRef.current.next());
    if (!pair) return;
    const ex = drawExercise(s.vocalLow, s.vocalHigh, pair.def, pair.dir, prevNeRef.current);
    prevNeRef.current = ex.ne;
    audio.stopAll();
    audio.playNote(ex.ne);
    setExercise(ex);
  };

  // Écran maintenu allumé tant qu'une session est en cours.
  useWakeLock(exercise !== null);

  const onHoldStart = () => {
    const ex = exerciseRef.current;
    if (!ex) return;
    if ('vibrate' in navigator) navigator.vibrate(12);
    const s = settingsRef.current;
    if (s.beginnerMode) {
      const hook = findHook(pairKey(ex.def, ex.dir));
      if (hook) {
        stopHoldRef.current = audio.holdSequence(transposeHook(hook, ex.ne)).release;
        return;
      }
    }
    if (s.holdPlays === 'ne-then-nc') {
      stopHoldRef.current = audio.holdSequence([
        { midi: ex.ne, at: 0, dur: 0.85 },
        { midi: ex.nc, at: 1.0, dur: 20 },
      ]).release;
    } else {
      stopHoldRef.current = audio.holdNote(ex.nc).release;
    }
  };

  const clearHold = () => {
    stopHoldRef.current?.();
    stopHoldRef.current = null;
  };

  const { holding, handlers } = useHold({
    enabled: exercise !== null && !sheetOpen,
    onHoldStart,
    // Relâché ou interrompu : le son se coupe, on RESTE sur l'exercice
    // (réécoute libre) — seul le swipe ↑ fait avancer.
    onHoldEnd: clearHold,
    onNext: () => {
      clearHold();
      if ('vibrate' in navigator) navigator.vibrate(20);
      advance();
    },
  });

  const replayNe = () => {
    const ex = exerciseRef.current;
    if (ex && !sheetOpenRef.current) audio.playNote(ex.ne);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') replayNe();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // replayNe ne lit que des refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sessionSnapshot = (s: Settings) =>
    JSON.stringify([[...s.pool].sort(), s.vocalLow, s.vocalHigh]);

  const openSheet = () => {
    audio.stopAll();
    sheetSnapRef.current = sessionSnapshot(settingsRef.current);
    sheetOpenRef.current = true;
    setSheetOpen(true);
  };

  const closeSheet = () => {
    sheetOpenRef.current = false;
    setSheetOpen(false);
    const s = settingsRef.current;
    if (sessionSnapshot(s) !== sheetSnapRef.current) {
      // Pool ou ambitus modifié : sac reconstruit, exercice frais.
      bagRef.current = s.pool.length > 0 ? new PairBag(s.pool) : null;
      prevNeRef.current = null;
      advance();
    }
  };

  const startSession = async () => {
    await audio.unlock();
    advance();
  };

  const wizardDone = (low: number, high: number) => {
    patchSettings({ vocalLow: low, vocalHigh: high });
    advance();
  };

  const needsWizard = settings.vocalLow === null || settings.vocalHigh === null;

  return (
    <>
      {needsWizard ? (
        <FirstRunWizard onDone={wizardDone} />
      ) : (
        <ExerciseScreen
          settings={settings}
          exercise={exercise}
          holding={holding}
          holdHandlers={handlers}
          holdEnabled={exercise !== null && !sheetOpen}
          onStart={startSession}
          onReplayNe={replayNe}
          onOpenSettings={openSheet}
        />
      )}
      {sheetOpen && (
        <SettingsSheet settings={settings} onPatch={patchSettings} onClose={closeSheet} />
      )}
    </>
  );
}
