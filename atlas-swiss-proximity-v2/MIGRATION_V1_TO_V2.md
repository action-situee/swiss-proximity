# Migration v1 vers v2

## Ce qui a ete repris de v1

- Sources PMTiles de proximite.
- Styles MapLibre et polices publiques.
- Categories OSM d'offre.
- Modes de demande.
- Seuils de distance `1300`, `3800`, `7000`.
- Scenarios `2017` et `2050`.
- Expressions MapLibre de rendu:
  - demande par somme de champs de part modale.
  - offre par maximum pondere selon poids et diversite.
- Legendes offre/demande.

## Ce qui a ete remplace dans v2

- La carte mock OSM raster et les points aleatoires ont ete remplaces par MapLibre + PMTiles.
- Les graphiques d'analyse utilisent maintenant la configuration active, pas `Math.random()`.
- Les composants station/transport de maquette sont conserves dans un onglet dedie, separe du noyau PMTiles v1.

## Ecarts connus

- La georecherche Nominatim de v1 n'est pas encore portee.
- La synchronisation double carte de v1 n'est pas encore portee.
- Le champ `year` est conserve dans l'interface pour compatibilite de scenario, mais les expressions de demande v1 actuellement portees lisent les champs `<mode>_<distance>`.
- Les arrets TP sont une couche de maquette deterministe, pas encore une source de production.

## Verification manuelle conseillee

1. Lancer `npm run dev`.
2. Ouvrir `http://127.0.0.1:5173/`.
3. Verifier Offre/H3 puis Offre/Polygone.
4. Passer en Demande et tester les trois seuils.
5. Survoler la carte pour verifier les popups.
6. Ouvrir `Arrêts`, selectionner plusieurs stations et tester Jour/Nuit/24h.
7. Lancer `npm run build` avant livraison.
