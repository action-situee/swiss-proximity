# get-data-proximity

Pipeline de collecte et de préparation des données pour analyser les proximités autour des arrêts de transport public.

## Structure

- `Notebooks/` : notebooks de collecte, préparation et agrégation.
- `Data/input/` : fichiers ajoutés manuellement au fil du projet.
- `Data/raw/` : exports bruts OSM / SITG.
- `Data/processed/` : buffers, cercles concentriques et indicateurs agrégés.

## Notebook disponible

- `Notebooks/01_collect_osm_sitg_station_buffers.ipynb`

Il prépare des cercles concentriques autour des arrêts, récupère les équipements et services OSM, conserve `opening_hours`, produit des indicateurs jour/nuit/24h, puis récupère les accidents SITG `OTC_ACCIDENTS` depuis 2023.

## Export pour l'application

Après avoir généré les fichiers dans `Data/processed/`, exportez les données web avec :

```bash
python scripts/export_station_web_data.py
```

L'export écrit un manifeste dans `../atlas-swiss-proximity-v2/public/data/stations-proximity/manifest.json` et un GeoJSON par arrêt dans `../atlas-swiss-proximity-v2/public/data/stations-proximity/stops/`.

La structure est volontairement indexée par `stop_id` : l'application charge d'abord le manifeste, puis récupère seulement le fichier de l'arrêt sélectionné. Les équipements OSM et les accidents gardent leurs coordonnées en WGS84 (`EPSG:4326`) pour être affichés directement dans MapLibre.

## Entrées optionnelles

Le notebook peut fonctionner sans fichier local en récupérant les arrêts TPG depuis SITG et en ajoutant une liste Léman Express. Pour utiliser votre propre référentiel d'arrêts, ajoutez :

`Data/input/arrets_tp.csv`

Colonnes attendues :

- `stop_id`
- `name`
- `lon`
- `lat`
- `network`
- `lines`

Un futur indice de précarité pourra être ajouté dans `Data/input/indice_precarite.geojson`, `Data/input/indice_precarite.gpkg` ou `Data/input/indice_precarite.csv`.

## Installation

```bash
cd get-data-proximity
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
jupyter notebook
```

Les requêtes OSM passent par Overpass via OSMnx. Pour de grandes emprises ou beaucoup d'arrêts, il faudra probablement découper par secteur ou mettre en cache les exports.
