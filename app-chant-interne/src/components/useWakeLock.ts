// Garde l'écran allumé pendant l'exercice (relire l'intervalle entre deux
// reps avec un écran qui s'éteint, c'est LA plaie sur Android). Ré-acquis
// au retour au premier plan ; silencieux si l'API manque ou refuse.

import { useEffect } from 'react';

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        // refusé (batterie faible, permission…) : tant pis
      }
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    void acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release().catch(() => {});
      lock = null;
    };
  }, [active]);
}
