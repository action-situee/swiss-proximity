# Architecture v2

## Stack

- React 18 avec Vite 6.
- MapLibre GL pour la carte.
- `pmtiles` pour lire les tuiles vectorielles v1 distantes.
- Tailwind CSS 4 pour l'interface issue de la maquette.
- Recharts pour le panneau d'analyse de configuration.

## Points d'entree

- `src/main.tsx`: montage React.
- `src/app/App.tsx`: etat global de l'application et persistance `sessionStorage`.
- `src/app/lib/proximityData.ts`: constantes v1, types, sources PMTiles, couleurs, bornes cartographiques et expressions MapLibre.
- `src/app/components/MapLibreMap.tsx`: carte MapLibre, sources PMTiles, couches, popup et legende.
- `src/app/components/Sidebar.tsx` + `ProximityPanel.tsx`: controles de carte et de donnees.
- `src/app/components/AnalysisPanel.tsx`: synthese non aleatoire de la configuration active.
- `src/app/components/TransportStationsMap.tsx`: carte de maquette pour les arrets TP, zones d'influence et points de services.
- `src/app/components/StationAnalysisSidebar.tsx`: panneau d'analyse station.
- `src/app/lib/stationData.ts`: donnees deterministes de demonstration pour l'experience TP v2.

## Flux de rendu cartographique

1. `App.tsx` maintient `mapMode`, `tilingType`, `distance`, `year`, les categories d'offre et les modes de demande.
2. `selectedTileName()` choisit une source parmi `demand_geneva_h3`, `demand_geneva_polygon`, `supply_h3`, `supply_polygon`.
3. `MapLibreMap.tsx` charge les quatre sources PMTiles et masque les trois inactives.
4. `fillExpression()` reconstruit l'expression MapLibre:
   - demande: somme des champs `<mode>_<distance>`.
   - offre: maximum pondere des champs `<diversity>_<category>`.
5. La popup lit les proprietes vectorielles de la tuile survolee.

## Persistance

Les reglages utilisateur sont conserves dans `sessionStorage`: `mapMode`, `tilingType`, `distance`, `year`, `categories`, `demandModes`.

## Vues de maquette conservees

L'onglet `Arrêts` reprend l'experience v2 originale avec selection d'arret, zones 300m/800m, services proches et graphiques d'accessibilite. Ces donnees sont deterministes et locales pour garder la maquette utilisable; elles sont separees du noyau PMTiles v1.
