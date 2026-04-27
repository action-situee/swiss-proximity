# Atlas Swiss Proximity v2

Application React/Vite qui reprend les donnees et les representations cartographiques de `atlas-swiss-proximity-v1` dans l'interface v2.

## Demarrage

```bash
npm install
npm run dev
npm run build
```

Le serveur de developpement expose l'app sur `http://127.0.0.1:5173/` par defaut.

## Etat de migration

- v1 reste en lecture seule et n'a pas ete modifiee.
- Les quatre jeux PMTiles v1 sont utilises directement depuis le CDN EPFL.
- Les styles MapLibre v1 sont copies dans `public/styles`.
- Les controles React v2 pilotent les memes dimensions que v1: offre/demande, H3/polygone, seuil de distance, scenario, categories, ponderation et diversite.
- Les donnees mock aleatoires de la carte principale ont ete retirees.
- Les vues de maquette v2 pour les arrets TP, l'analyse station et les modes Jour/Nuit/24h sont conservees autour de la carte de proximite fonctionnelle.

Voir aussi:

- `ARCHITECTURE.md`
- `DATA_SOURCES.md`
- `DESIGN_NOTES.md`
- `MIGRATION_V1_TO_V2.md`
