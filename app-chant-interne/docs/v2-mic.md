# v2 — Micro : détection de hauteur, ambitus automatique, scoring

Scoping (juillet 2026). Rien ici n'est implémenté ; v1 reste 100 % auto-évaluée.

## Faisabilité — courte réponse : oui, et tout reste sur l'appareil

La détection de hauteur d'une voix seule dans un navigateur est un problème
résolu : `getUserMedia` + AudioWorklet + un algorithme d'autocorrélation
(YIN / MPM, ~100 lignes, ou le paquet npm `pitchy`). Fenêtre de 4096
échantillons à 48 kHz → détection fiable jusqu'à ~65 Hz (en-dessous du C2
d'une basse), latence de mise à jour ~10–40 ms, CPU négligeable. Aucun
serveur, aucun envoi réseau : la voix ne quitte jamais le téléphone (PWA déjà
en HTTPS, requis pour le micro). Si la robustesse déçoit en conditions
réelles : plan B = modèle CREPE-tiny en WASM (~3 Mo), probablement inutile
pour une voix seule à distance de téléphone.

**Notre avantage décisif sur un accordeur générique** : on ne fait pas de la
détection aveugle — on *vérifie une hypothèse*. On connaît NC et l'ambitus
vocal ; on peut contraindre la recherche de f0 à l'ambitus ± marge, ce qui
élimine presque toutes les erreurs d'octave (le défaut classique de YIN).

## Les trois features, par ordre de valeur/effort

### 1. Ambitus automatique (le plus facile, ~1–2 jours)
Assistant : « Chante *ooo* sur ta note la plus grave confortable, 2 s » →
médiane des trames voisées confiantes → proposition affichée sur le clavier →
l'utilisateur **confirme** (l'humain reste dans la boucle : ça absorbe les
erreurs d'octave et le vocal fry). Pareil pour l'aiguë. Le sélecteur manuel
reste disponible.

### 2. Scoring de la note chantée (~2–3 jours + réglage sur appareil)
S'insère dans la boucle existante sans la changer : NE joue → l'app écoute →
tu chantes NC → tu tiens NEXT. Au relâcher, verdict : *juste* (±25 cents),
*presque* (±50), sinon la note réellement chantée + flèche de direction.
- Segmentation : dernière plage voisée stable ≥ 300 ms avant l'appui ;
  hauteur = médiane des derniers 60 % du segment (ignore l'attaque « scoopée »,
  absorbe le vibrato).
- Le micro entend aussi le haut-parleur : **fenêtrage temporel** — on ne
  score que ce qui est chanté après la fin du one-shot de NE et avant la
  tenue. Contraintes getUserMedia : `echoCancellation/noiseSuppression/
  autoGainControl: false` (ces traitements massacrent l'analyse de hauteur).
- Philosophie préservée : l'oreille reste le juge ; le score est un retour,
  pas un jeu. Affichage discret après coup, jamais d'aiguille pendant qu'on
  chante (sinon on chante avec les yeux). Stats par intervalle (quoi
  bosser) : petit plus une fois les données là.

### 3. Mode mains libres (~1–2 jours)
Note juste tenue ≥ 1 s → l'app enchaîne toute seule. Drill complet sans
toucher l'écran — précieux au piano. (Corollaire du scoring, presque gratuit.)

## Architecture prévue

- `src/lib/pitch.ts` — YIN/MPM **pur**, testé avec des signaux synthétiques
  (sinus, dents de scie, vibrato ±50 cents, bruit) comme le reste de lib/.
- `src/audio/mic.ts` — getUserMedia + AudioWorklet, publie un flux
  `{ f0, confidence, t }` ; coupe le micro dès que l'app passe en arrière-plan.
- Permission demandée **au moment d'activer l'option**, jamais au premier
  lancement ; tout est optionnel, la v1 reste le mode par défaut.

## Risques connus et parades

| Risque | Parade |
|---|---|
| Erreurs d'octave (sous-harmoniques YIN) | recherche contrainte à l'ambitus ± marge + seuil de confiance |
| Voix grave sur micro de téléphone (rolloff < 100 Hz) | la f0 se lit dans les harmoniques : autocorrélation OK |
| Haut-parleur dans le micro | fenêtrage temporel ; casque recommandé de toute façon |
| Piano/bruit ambiant pendant la pratique | v2 = voix seule, pièce calme ; documenter la limite |
| Batterie (micro + worklet en continu) | acceptable en session ; arrêt auto en arrière-plan |
| Seuils (±25/50 cents, 300 ms…) à calibrer | session de réglage avec Theo, vraies voix — c'est le vrai chantier |

## Ordre proposé

v2.0 ambitus auto → v2.1 scoring → v2.2 mains libres + stats.
~1 semaine de travail au total, dont l'essentiel du risque dans le réglage
des seuils sur appareil réel avec Theo comme cobaye.
