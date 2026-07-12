// Feuille de réglages plein écran : Intervalles / Ambitus / Timbre / Options.

import { useSyncExternalStore } from 'react';
import { audio } from '../audio/engine';
import { spellMidi } from '../lib/theory';
import type { Settings, TimbreId } from '../state/settings';
import { IntervalGrid } from './IntervalGrid';
import { RangePicker } from './RangePicker';

const TIMBRES: { id: TimbreId; label: string }[] = [
  { id: 'piano', label: 'Piano' },
  { id: 'organ', label: 'Orgue doux' },
  { id: 'pad', label: 'Nappe' },
];

export interface SettingsSheetProps {
  settings: Settings;
  onPatch(patch: Partial<Settings>): void;
  onClose(): void;
}

function OptionRow({
  label,
  hint,
  checked,
  onToggle,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onToggle(): void;
}) {
  return (
    <div className="opt-row">
      <div className="opt-text">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch${checked ? ' switch--on' : ''}`}
        onClick={onToggle}
      >
        <span className="switch-knob" />
      </button>
    </div>
  );
}

export function SettingsSheet({ settings, onPatch, onClose }: SettingsSheetProps) {
  const pianoLoad = useSyncExternalStore(
    (cb) => audio.subscribe(cb),
    () => audio.loadState(),
  );

  const auditionMidi =
    settings.vocalLow !== null && settings.vocalHigh !== null
      ? Math.round((settings.vocalLow + settings.vocalHigh) / 2)
      : 57; // A3

  return (
    <div className="sheet" role="dialog" aria-label="Réglages">
      <header className="sheet-head">
        <h2>Réglages</h2>
        <button type="button" className="close-btn" onClick={onClose} aria-label="Fermer">
          ✕
        </button>
      </header>

      <section>
        <h3>Intervalles</h3>
        <IntervalGrid pool={settings.pool} onChange={(pool) => onPatch({ pool })} />
        {settings.pool.length === 0 && (
          <p className="warn">Sélectionne au moins un intervalle pour t’exercer.</p>
        )}
      </section>

      <section>
        <h3>Ambitus de chant</h3>
        {settings.vocalLow !== null && settings.vocalHigh !== null && (
          <>
            <p className="ambitus-summary">
              {spellMidi(settings.vocalLow).text} – {spellMidi(settings.vocalHigh).text}
            </p>
            <RangePicker
              low={settings.vocalLow}
              high={settings.vocalHigh}
              onChange={(vocalLow, vocalHigh) => onPatch({ vocalLow, vocalHigh })}
            />
          </>
        )}
      </section>

      <section>
        <h3>Timbre</h3>
        <div className="chips">
          {TIMBRES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`chip${settings.timbre === t.id ? ' chip--armed' : ''}`}
              onClick={() => {
                onPatch({ timbre: t.id });
                audio.setTimbre(t.id);
                audio.playNote(auditionMidi);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {settings.timbre === 'piano' && pianoLoad === 'loading' && (
          <p className="warn">Chargement du piano… (l’orgue prend le relais en attendant)</p>
        )}
      </section>

      <section>
        <h3>Options</h3>
        <OptionRow
          label="Afficher le clavier"
          hint="NE en bleu, NC en rouge pendant la tenue"
          checked={settings.showStrip}
          onToggle={() => onPatch({ showStrip: !settings.showStrip })}
        />
        <OptionRow
          label="Rejouer NE avant NC"
          hint="En tenant NEXT : la note entendue, puis la note à chanter"
          checked={settings.holdPlays === 'ne-then-nc'}
          onToggle={() =>
            onPatch({ holdPlays: settings.holdPlays === 'nc' ? 'ne-then-nc' : 'nc' })
          }
        />
        <OptionRow
          label="Mode débutant (airs connus)"
          hint="NEXT joue un air célèbre qui commence par l’intervalle"
          checked={settings.beginnerMode}
          onToggle={() => onPatch({ beginnerMode: !settings.beginnerMode })}
        />
      </section>

      <footer className="attrib">
        <p>Astuce : casque recommandé pour bien entendre les notes très graves.</p>
        <p>
          Échantillons de piano : Salamander Grand Piano — Alexander Holm, licence CC-BY 3.0.
        </p>
      </footer>
    </div>
  );
}
