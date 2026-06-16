# Prétraitement des données par arrêt

Ce dossier contient le notebook de préparation des données pour l'onglet Léman Express :

- `preprocess_station_theme_data.ipynb` : pipeline de collecte, normalisation, prévisualisation et export.
- `requirements-station-preprocessing.txt` : dépendances Python pour exécuter le notebook.

L'objectif est de préparer les données avant l'app, arrêt par arrêt, afin de contrôler les sources, les statistiques et les cartes de prévisualisation dans un environnement de travail data.

## Sources utilisées

Le pipeline privilégie les données SITG pour les couches structurantes :

- gares Léman Express : `AGGLO_GARES`
- arrêts tram : `Hosted/TPG_ARRETS`
- équipements publics : écoles, soins, sports, commerces, postes, P+R, éclairage SITG
- sécurité : `Hosted/OTC_ACCIDENTS`
- espaces publics et naturels : espaces publics, bancs, corbeilles, milieux naturels
- mobilité douce : aménagements cyclables, réseaux piétons, itinéraires, zones 20-30
- urbanisme : bâtiments, plans guides, affectation simplifiée, population/emplois

Quelques couches OpenStreetMap sont ajoutées via Overpass pour démontrer le mélange de sources ouvertes quand une information n'est pas disponible, pas assez lisible, ou utile en complément :

- éclairage public OSM : `highway=street_lamp`
- stationnement vélo OSM : `amenity=bicycle_parking`
- stations de réparation vélo OSM : `amenity=bicycle_repair_station`
- traversées et feux OSM : `highway=crossing` ou `highway=traffic_signals`
- eau potable OSM : `amenity=drinking_water`
- toilettes publiques OSM : `amenity=toilets`
- arbres OSM : `natural=tree`

Chaque feature exportée contient `source_type`, avec `SITG` ou `OSM`, ainsi que `source_layer`. Les objets OSM conservent aussi `osm_id`, `osm_type` et `osm_tags`.

## Données générées

Par défaut, les exports sont écrits dans :

```text
public/data/stations-theme-preprocessed/
```

Structure :

```text
public/data/stations-theme-preprocessed/
  manifest.json
  stops/
    {station_id}.geojson
    {station_id}.summary.json
  summaries/
    station_theme_metrics.csv
```

Le fichier principal est `stops/{station_id}.geojson`. Il contient toutes les géométries utiles autour d'un arrêt, toutes thématiques confondues, avec des propriétés normalisées :

- `station_id`, `station_name`, `station_type`
- `theme_id`, `theme_label`
- `layer_id`, `layer_label`
- `kind`
- `source_type`, `source_layer`
- `distance_m`, `ring_label`
- champs métiers selon les couches : accidents, bâti, population/emplois, surfaces, longueurs, tags OSM

Le fichier `stops/{station_id}.summary.json` contient les statistiques déjà calculées pour la sidebar. Le fichier `summaries/station_theme_metrics.csv` consolide ces statistiques pour comparer les arrêts.

## Exécution locale

Créer et activer l'environnement Python :

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r notebooks/requirements-station-preprocessing.txt
python -m ipykernel install --user --name atlas-station-preprocessing --display-name "Atlas station preprocessing"
```

Ouvrir ensuite le notebook :

```bash
jupyter lab notebooks/preprocess_station_theme_data.ipynb
```

Dans le notebook, commencer avec `RUN_FULL_EXPORT = False` pour prévisualiser un arrêt. Quand les couches et statistiques sont validées, passer `RUN_FULL_EXPORT = True`.

## Mise en ligne pour le déploiement

Le dossier `public/data/stations-theme-preprocessed/` est conçu pour être publié tel quel comme dossier statique.

Exemple avec un bucket R2 compatible S3 :

```bash
aws s3 sync public/data/stations-theme-preprocessed/ s3://NOM_DU_BUCKET/stations-theme-preprocessed/ \
  --endpoint-url https://ACCOUNT_ID.r2.cloudflarestorage.com \
  --delete
```

Après publication, conserver la même structure relative :

```text
https://static.example.com/stations-theme-preprocessed/manifest.json
https://static.example.com/stations-theme-preprocessed/stops/{station_id}.geojson
```

L'app pourra ensuite charger `manifest.json`, puis les fichiers `data_url` et `summary_url` de chaque arrêt. Tant que les chemins relatifs restent identiques, il suffit de changer l'URL racine des données.

## Points à surveiller

Les services SITG et Overpass peuvent limiter ou ralentir les requêtes. Pour un export complet, lancer le notebook depuis un environnement stable et éviter de relancer plusieurs exports simultanés.

Les données OSM sont contributives. Elles sont utiles pour démontrer le mix de sources et enrichir certains thèmes, mais elles doivent être interprétées avec leur qualité locale et leur couverture réelle.
