# Sources de donnees

## PMTiles v1

Base CDN:

```text
https://enacit4r-cdn.epfl.ch/lasur-swiss-proximity/output
```

Fichiers utilises:

- `demand_geneva_h3.pmtiles`
- `demand_geneva_polygon.pmtiles`
- `supply_h3.pmtiles`
- `supply_polygon.pmtiles`

Ces URLs sont declarees dans `src/app/lib/proximityData.ts`.

## Fonds de carte

Les styles v1 ont ete copies dans:

```text
public/styles/lightbase.json
public/styles/light.json
public/styles/dark.json
```

Les polices v1 sont copiees dans `public/fonts/Akzidenz-Grotesk-Pro`.

## Mise a jour des donnees

1. Executer le pipeline v1 de preparation des donnees dans `atlas-swiss-proximity-v1/data_processing` ou le pipeline de production equivalent.
2. Publier les nouveaux fichiers PMTiles avec les memes noms, ou ajouter de nouvelles entrees dans `listTilesParams`.
3. Si les noms de champs changent, adapter les expressions dans `expressionSum()` et `expressionMax()`.
4. Verifier que le CDN conserve:
   - `Content-Type: application/octet-stream`
   - `Accept-Ranges: bytes`
   - `Access-Control-Allow-Origin: *`
5. Relancer `npm run build` dans v2.

## Schema attendu

Offre:

- Champs sous la forme `<diversity>_<category>`, par exemple `5_All`, `3_Culture`, `1_Transport`.
- Les valeurs representent une distance en metres.

Demande:

- Champs sous la forme `<mode>_<distance>`, par exemple `All_modes_7000`, `Velo_3800`.
- Les valeurs sont des parts de deplacements entre 0 et 1.

## Donnees arrets TP de maquette

Les vues `Arrêts` utilisent `src/app/lib/stationData.ts`.

Sources actuelles:

- Trams TPG: service SITG `TPG_ARRETS`, filtre sur les lignes `12`, `14`, `15`, `17`, `18`.
- Léman Express: gares du tronc Coppet-Annemasse, coordonnées vérifiées via `transport.opendata.ch`.
- Tracé ferroviaire: service SITG `GMO_GRAPHE_FERROVIAIRE_REGION`, filtré sur les tronçons existants du Léman Express (`L1` à `L4`) et les voies de tramway. Si le service échoue, l'app revient au tracé direct Coppet-Annemasse.

Notes:

1. `TPG_ARRETS` contient plusieurs points par arrêt lorsque les quais, directions ou lignes diffèrent. L'app les agrège par nom d'arrêt pour garder une liste exploitable dans l'interface.
2. Le tracé Léman Express affiché est une ligne de lecture reliant les gares du tronc Coppet-Annemasse.
3. Une prochaine étape robuste serait de remplacer la liste statique Léman Express par un import GTFS complet depuis opentransportdata.swiss.
4. `stationServiceMetrics()` reste une analyse d'interface, derivee des categories actives; elle n'est pas encore un comptage spatial de POI autour des arrêts.
