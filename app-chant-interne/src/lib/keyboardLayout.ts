// Géométrie du clavier : blanches côte à côte, noires centrées sur les
// frontières, largeur 0,6 × blanche, hauteur 0,62 × blanche.

export interface KeyLayout {
  midi: number;
  isBlack: boolean;
  x: number;
  w: number;
  h: number;
}

const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

export function isBlackKey(midi: number): boolean {
  return BLACK_PCS.has(((midi % 12) + 12) % 12);
}

export function snapToWhite(midi: number, dir: 'down' | 'up'): number {
  let m = midi;
  while (isBlackKey(m)) m += dir === 'down' ? -1 : 1;
  return m;
}

export function layoutKeys(
  fromMidi: number,
  toMidi: number,
  whiteW: number,
  whiteH: number,
): { keys: KeyLayout[]; width: number } {
  const keys: KeyLayout[] = [];
  let whiteIdx = 0;
  for (let m = fromMidi; m <= toMidi; m++) {
    if (isBlackKey(m)) {
      keys.push({
        midi: m,
        isBlack: true,
        x: whiteIdx * whiteW - 0.3 * whiteW,
        w: 0.6 * whiteW,
        h: 0.62 * whiteH,
      });
    } else {
      keys.push({ midi: m, isBlack: false, x: whiteIdx * whiteW, w: whiteW, h: whiteH });
      whiteIdx++;
    }
  }
  return { keys, width: whiteIdx * whiteW };
}
