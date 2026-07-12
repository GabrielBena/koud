// Capture micro pour la détection d'ambitus : getUserMedia SANS les
// traitements (echoCancellation / noiseSuppression / autoGainControl
// massacrent l'analyse de hauteur d'une voix chantée), AnalyserNode
// interrogé ~22 fois/s. Le micro est réellement coupé au stop()
// (l'indicateur système disparaît — signal de confiance).

import * as Tone from 'tone';

export interface MicSession {
  stop(): void;
}

export async function startMicCapture(
  onFrame: (buf: Float32Array, sampleRate: number) => void,
): Promise<MicSession> {
  await Tone.start();
  const ctx = Tone.getContext().rawContext as AudioContext;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 4096;
  source.connect(analyser);

  const buf = new Float32Array(analyser.fftSize);
  let raf = 0;
  let last = 0;
  let stopped = false;

  const tick = (t: number) => {
    if (stopped) return;
    raf = requestAnimationFrame(tick);
    if (t - last < 45) return; // ~22 analyses/s, largement assez
    last = t;
    analyser.getFloatTimeDomainData(buf);
    onFrame(buf, ctx.sampleRate);
  };
  raf = requestAnimationFrame(tick);

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(raf);
      try {
        source.disconnect();
      } catch {
        // déjà déconnecté
      }
      for (const track of stream.getTracks()) track.stop();
    },
  };
}
