import { describe, expect, it } from 'vitest';
import { detectPitch, midiFromF0, summarizeCapture } from './pitch';

const SR = 48000;
const N = 4096;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sine(f: number, sr = SR, n = N, amp = 0.5): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * f * i) / sr);
  return out;
}

function saw(f: number, sr = SR, n = N, amp = 0.4): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * (2 * (((f * i) / sr) % 1) - 1);
  return out;
}

function noise(n = N, amp = 0.3, seed = 7): Float32Array {
  const rand = mulberry32(seed);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * (2 * rand() - 1);
  return out;
}

function vibratoSine(
  f: number,
  depthCents: number,
  rateHz: number,
  sr = SR,
  n = N,
  phase0 = 0,
): Float32Array {
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const mod = Math.pow(2, (depthCents * Math.sin((2 * Math.PI * rateHz * i) / sr + phase0)) / 1200);
    phase += (2 * Math.PI * f * mod) / sr;
    out[i] = 0.5 * Math.sin(phase);
  }
  return out;
}

describe('midiFromF0', () => {
  it('références', () => {
    expect(midiFromF0(440)).toBeCloseTo(69, 6);
    expect(midiFromF0(261.6256)).toBeCloseTo(60, 3);
    expect(midiFromF0(82.4069)).toBeCloseTo(40, 3); // E2
  });
});

describe('detectPitch', () => {
  it('sinus 220 Hz : f0 précise, clarté haute', () => {
    const r = detectPitch(sine(220), SR)!;
    expect(r).not.toBeNull();
    expect(Math.abs(r.f0 - 220)).toBeLessThan(0.5);
    expect(r.clarity).toBeGreaterThan(0.9);
  });

  it('voix grave : E2 (82.4 Hz) détecté, y compris à 44.1 kHz', () => {
    for (const sr of [48000, 44100]) {
      const r = detectPitch(sine(82.4069, sr), sr)!;
      expect(r).not.toBeNull();
      expect(Math.abs(r.f0 - 82.4069)).toBeLessThan(1);
    }
  });

  it('aigu : C6 (1046.5 Hz) détecté à ±5 Hz', () => {
    const r = detectPitch(sine(1046.5), SR)!;
    expect(r).not.toBeNull();
    expect(Math.abs(r.f0 - 1046.5)).toBeLessThan(5);
  });

  it('riche en harmoniques (dents de scie) : pas d’erreur d’octave', () => {
    for (const f of [110, 146.83, 220]) {
      const r = detectPitch(saw(f), SR)!;
      expect(r).not.toBeNull();
      expect(Math.abs(r.midi - midiFromF0(f))).toBeLessThan(0.3);
    }
  });

  it('bruit blanc → null (non voisé)', () => {
    expect(detectPitch(noise(), SR)).toBeNull();
  });

  it('silence → null', () => {
    expect(detectPitch(new Float32Array(N), SR)).toBeNull();
  });

  it('sinus + bruit (RSB ~14 dB) : toujours détecté', () => {
    const s = sine(220, SR, N, 0.5);
    const nz = noise(N, 0.1, 3);
    const mixed = new Float32Array(N);
    for (let i = 0; i < N; i++) mixed[i] = s[i] + nz[i];
    const r = detectPitch(mixed, SR)!;
    expect(r).not.toBeNull();
    expect(Math.abs(r.f0 - 220)).toBeLessThan(1);
  });

  it('hors plage demandée → null (recherche contrainte)', () => {
    expect(detectPitch(sine(40), SR, { fMin: 55 })).toBeNull();
    expect(detectPitch(sine(220), SR, { fMin: 300 })).toBeNull();
  });

  it('vibrato ±50 cents : reste à moins d’un demi-ton du centre', () => {
    const r = detectPitch(vibratoSine(220, 50, 5.5), SR)!;
    expect(r).not.toBeNull();
    expect(Math.abs(r.midi - midiFromF0(220))).toBeLessThan(0.8);
  });
});

describe('summarizeCapture', () => {
  it('médiane robuste aux trames aberrantes d’octave', () => {
    const frames = [
      ...Array.from({ length: 30 }, (_, i) => 52 + 0.05 * Math.sin(i)),
      28, 28, 64, // aberrations (octaves fantômes)
    ];
    const sum = summarizeCapture(frames)!;
    expect(sum).not.toBeNull();
    expect(sum.midi).toBe(52);
    expect(Math.abs(sum.centsOff)).toBeLessThanOrEqual(6);
  });

  it('pas assez de trames voisées → null', () => {
    expect(summarizeCapture([52, 52, 52])).toBeNull();
  });

  it('glissando / prise instable (IQR > 1.5 demi-ton) → null', () => {
    const gliss = Array.from({ length: 40 }, (_, i) => 48 + i * 0.12);
    expect(summarizeCapture(gliss)).toBeNull();
  });

  it('capture au vibrato : médiane au centre', () => {
    // simule ~2 s de trames YIN sur un vibrato ±50 cents
    const frames = Array.from({ length: 44 }, (_, i) => 57 + 0.5 * Math.sin(i / 2));
    const sum = summarizeCapture(frames)!;
    expect(sum).not.toBeNull();
    expect(sum.midi).toBe(57);
    expect(Math.abs(sum.centsOff)).toBeLessThan(25);
  });
});
