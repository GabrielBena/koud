# Chant intérieur

Mini-app d'entraînement au **chant intérieur** (audiation) pour Theo : tu
entends une note, tu chantes la note à l'intervalle demandé, tu tiens **NEXT**
pour vérifier, tu lâches pour l'exercice suivant.

L'astuce centrale de la spec (`app chant intérieur.pdf`) : la note jouée (NE)
est tirée dans l'ambitus vocal **translaté de l'intervalle** — la note à
chanter (NC) tombe donc toujours dans la voix.

## Stack

PWA installable (Android d'abord) : Vite + React + TypeScript, Tone.js
(piano échantillonné Salamander + 2 timbres tenus), vite-plugin-pwa
(hors-ligne complet), Vitest.

## Développement

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev -- --host   # pour tester depuis un téléphone sur le même WiFi
npm test             # théorie musicale, moteur d'exercice, banque d'airs…
npm run build        # tsc + vite build + service worker (dist/)
npm run preview      # sert dist/ en local
```

## Points d'implémentation à connaître

- `src/lib/` est **pur** (aucun import React/Tone) et entièrement testé :
  intervalles, orthographe enharmonique sans double altération, translation
  d'ambitus, sac aléatoire, banque d'airs.
- `src/audio/engine.ts` : `lookAhead = 0.02` (sinon le bouton est pâteux),
  `Tone.start()` rappelé à chaque chemin de lecture, repli orgue tant que le
  piano n'est pas décodé.
- Bouton NEXT (`useHold.ts`) : Pointer Events + capture ; `pointercancel` /
  écran verrouillé = **abandon** (le son se coupe, l'exercice ne saute pas).
- Banque d'airs (`songBank.ts`) : les entrées `verified: false` ne jouent
  jamais tant que Theo ne les a pas validées ; un test d'intégrité garantit
  que le premier saut de chaque air est bien l'intervalle annoncé.

## Crédits

Échantillons de piano : [Salamander Grand Piano](https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html)
d'Alexander Holm — licence CC-BY 3.0.
