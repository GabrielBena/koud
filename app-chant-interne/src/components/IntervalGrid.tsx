// Les 28 interrupteurs de Theo : une ligne par intervalle, une colonne
// par direction, avec « tout / rien » par colonne.

import { INTERVALS, pairKey, type Direction, type PairKey } from '../lib/theory';

export interface IntervalGridProps {
  pool: PairKey[];
  onChange(pool: PairKey[]): void;
}

export function IntervalGrid({ pool, onChange }: IntervalGridProps) {
  const has = (k: PairKey) => pool.includes(k);

  const toggle = (k: PairKey) => {
    onChange(has(k) ? pool.filter((p) => p !== k) : [...pool, k]);
  };

  const setColumn = (dir: Direction, on: boolean) => {
    const column = INTERVALS.map((d) => pairKey(d, dir));
    if (on) onChange([...new Set([...pool, ...column])]);
    else onChange(pool.filter((p) => !column.includes(p)));
  };

  const colHead = (dir: Direction, arrow: string) => (
    <div className="col-head">
      <span className="col-arrow">{arrow}</span>
      <span className="mini-btns">
        <button type="button" onClick={() => setColumn(dir, true)}>
          tout
        </button>
        <button type="button" onClick={() => setColumn(dir, false)}>
          rien
        </button>
      </span>
    </div>
  );

  return (
    <div className="interval-grid">
      <div className="row-label" />
      {colHead('asc', '↑')}
      {colHead('desc', '↓')}
      {INTERVALS.map((def) => {
        const kAsc = pairKey(def, 'asc');
        const kDesc = pairKey(def, 'desc');
        return (
          <div key={def.label} className="grid-row-contents">
            <div className="row-label">{def.label}</div>
            <button
              type="button"
              className={`pair-toggle${has(kAsc) ? ' on' : ''}`}
              aria-pressed={has(kAsc)}
              onClick={() => toggle(kAsc)}
            >
              {def.label}↑
            </button>
            <button
              type="button"
              className={`pair-toggle${has(kDesc) ? ' on' : ''}`}
              aria-pressed={has(kDesc)}
              onClick={() => toggle(kDesc)}
            >
              {def.label}↓
            </button>
          </div>
        );
      })}
    </div>
  );
}
