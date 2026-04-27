#!/usr/bin/env python3
"""Export processed station proximity data for the web app.

The processing notebook keeps detailed OSM and accident features in GeoPackage
files. This script converts them to WGS84 GeoJSON and writes one small file per
stop so the front-end can fetch only the selected stop after a map click.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import geopandas as gpd
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "Data" / "processed"
DEFAULT_OUTPUT = ROOT.parent / "atlas-swiss-proximity-v2" / "public" / "data" / "stations-proximity"

OSM_INPUT = PROCESSED / "osm_features_by_station_ring.gpkg"
ACCIDENT_INPUT = PROCESSED / "accidents_by_station_ring.gpkg"
STATIONS_INPUT = PROCESSED / "tp_stations.geojson"

RING_ORDER = ["0-250m", "250-500m", "500-750m", "750-1000m"]

CATEGORY_BY_TAG = {
    "university": "Education",
    "school": "Education",
    "college": "Education",
    "kindergarten": "Education",
    "arts_centre": "Culture",
    "library": "Culture",
    "theatre": "Culture",
    "nightclub": "Culture",
    "cinema": "Culture",
    "museum": "Culture",
    "events_venue": "Culture",
    "events_centre": "Culture",
    "place_of_worship": "Culture",
    "religion": "Culture",
    "nursing_home": "Care",
    "pharmacy": "Care",
    "hospital": "Care",
    "clinic": "Care",
    "doctors": "Care",
    "doctor": "Care",
    "dentist": "Care",
    "optician": "Care",
    "hairdresser": "Care",
    "beauty": "Care",
    "park": "Outdoor",
    "playground": "Outdoor",
    "square": "Outdoor",
    "recreation_ground": "Outdoor",
    "fountain": "Outdoor",
    "riverbank": "Outdoor",
    "river": "Outdoor",
    "water": "Outdoor",
    "garden": "Outdoor",
    "sports_centre": "Sport",
    "sports_hall": "Sport",
    "pitch": "Sport",
    "swimming_pool": "Sport",
    "swimming": "Sport",
    "water_park": "Sport",
    "fitness_centre": "Sport",
    "fitness_station": "Sport",
    "ice_rink": "Sport",
    "tennis": "Sport",
    "golf_course": "Sport",
    "stadium": "Sport",
    "restaurant": "Catering",
    "fast_food": "Catering",
    "cafe": "Catering",
    "pub": "Catering",
    "bar": "Catering",
    "food_court": "Catering",
    "biergarten": "Catering",
    "marketplace": "Provision",
    "supermarket": "Provision",
    "bakery": "Provision",
    "general": "Provision",
    "butcher": "Provision",
    "greengrocer": "Provision",
    "greengrocery": "Provision",
    "kiosk": "Shopping",
    "mall": "Shopping",
    "department_store": "Shopping",
    "convenience": "Shopping",
    "clothes": "Shopping",
    "florist": "Shopping",
    "chemist": "Shopping",
    "books": "Shopping",
    "shoes": "Shopping",
    "furniture": "Shopping",
    "alcohol": "Shopping",
    "anime": "Shopping",
    "antiques": "Shopping",
    "appliance": "Shopping",
    "art": "Shopping",
    "baby_goods": "Shopping",
    "bag": "Shopping",
    "bathroom_furnishing": "Shopping",
    "bed": "Shopping",
    "bedding": "Shopping",
    "beverages": "Shopping",
    "bicycle": "Shopping",
    "boutique": "Shopping",
    "camera": "Shopping",
    "car": "Shopping",
    "car_parts": "Shopping",
    "car_repair": "Shopping",
    "chocolate": "Shopping",
    "coffee": "Shopping",
    "computer": "Shopping",
    "confectionery": "Shopping",
    "copyshop": "Shopping",
    "cosmetics": "Shopping",
    "curtain": "Shopping",
    "department_store": "Shopping",
    "doityourself": "Shopping",
    "dry_cleaning": "Shopping",
    "electronics": "Shopping",
    "fabric": "Shopping",
    "fashion_accessories": "Shopping",
    "frame": "Shopping",
    "gift": "Shopping",
    "hardware": "Shopping",
    "hifi": "Shopping",
    "houseware": "Shopping",
    "interior_decoration": "Shopping",
    "jewelry": "Shopping",
    "laundry": "Shopping",
    "leather": "Shopping",
    "lighting": "Shopping",
    "mobile_phone": "Shopping",
    "music": "Shopping",
    "musical_instrument": "Shopping",
    "newsagent": "Shopping",
    "office_market": "Shopping",
    "outdoor": "Shopping",
    "paint": "Shopping",
    "party": "Shopping",
    "perfumery": "Shopping",
    "pet": "Shopping",
    "photo": "Shopping",
    "repair": "Shopping",
    "second_hand": "Shopping",
    "security": "Shopping",
    "shoe_repair": "Shopping",
    "sports": "Shopping",
    "stationery": "Shopping",
    "tailor": "Shopping",
    "tobacco": "Shopping",
    "toys": "Shopping",
    "travel_agency": "Shopping",
    "watches": "Shopping",
    "wine": "Shopping",
    "vacant": "Shopping",
    "community_centre": "Public",
    "police": "Public",
    "post_box": "Public",
    "post_office": "Public",
    "bank": "Public",
    "atm": "Public",
    "townhall": "Public",
    "courthouse": "Public",
    "government": "Public",
    "ngo": "Public",
    "association": "Public",
    "social_facility": "Public",
    "bus_station": "Transport",
    "taxi": "Transport",
    "station": "Transport",
    "halt": "Transport",
    "tram_stop": "Transport",
    "bus_stop": "Transport",
    "stop_position": "Transport",
    "platform": "Transport",
    "bench": "UrbanFurniture",
    "waste_basket": "UrbanFurniture",
    "waste_disposal": "UrbanFurniture",
    "drinking_water": "UrbanFurniture",
    "toilets": "UrbanFurniture",
    "vending_machine": "UrbanFurniture",
    "shelter": "UrbanFurniture",
    "clock": "UrbanFurniture",
    "picnic_table": "UrbanFurniture",
    "outdoor_seating": "UrbanFurniture",
    "parking": "Parking",
    "parking_space": "Parking",
    "parking_entrance": "Parking",
    "parking_exit": "Parking",
    "bicycle_parking": "Parking",
    "motorcycle_parking": "Parking",
    "car_sharing": "Parking",
    "car_rental": "Parking",
    "fire_hydrant": "Safety",
    "defibrillator": "Safety",
    "fire_extinguisher": "Safety",
    "emergency_ward_entrance": "Safety",
    "artwork": "Tourism",
    "hotel": "Tourism",
    "information": "Tourism",
    "attraction": "Tourism",
    "gallery": "Tourism",
    "viewpoint": "Tourism",
    "guest_house": "Tourism",
    "apartment": "Tourism",
    "bureau_de_change": "Services",
    "money_transfer": "Services",
    "company": "Services",
    "estate_agent": "Services",
    "architect": "Services",
    "diplomatic": "Services",
    "lawyer": "Services",
    "notary": "Services",
    "insurance": "Services",
    "accountant": "Services",
    "financial": "Services",
    "consulting": "Services",
}

CATEGORY_COLORS = {
    "Education": "#7c3aed",
    "Culture": "#c026d3",
    "Care": "#db2777",
    "Outdoor": "#16a34a",
    "Sport": "#ea580c",
    "Catering": "#dc2626",
    "Provision": "#ca8a04",
    "Shopping": "#0891b2",
    "Public": "#475569",
    "Transport": "#2563eb",
    "UrbanFurniture": "#64748b",
    "Parking": "#334155",
    "Safety": "#b91c1c",
    "Tourism": "#8b5cf6",
    "Services": "#0f766e",
    "Other": "#6b7280",
}

OSM_COLUMNS = [
    "osm_type",
    "osmid",
    "name",
    "osm_category",
    "opening_hours_raw",
    "open_day",
    "open_night",
    "open_24h",
    "amenity",
    "shop",
    "healthcare",
    "leisure",
    "tourism",
    "office",
    "craft",
    "public_transport",
    "railway",
    "emergency",
    "stop_id",
    "stop_name",
    "network",
    "lines",
    "ring_label",
    "ring_from_m",
    "ring_to_m",
]

ACCIDENT_COLUMNS = [
    "ID_ACCIDENT",
    "DATE_UTC",
    "HEURE",
    "ANNEE",
    "JOUR",
    "GROUPE_ACCIDENT",
    "TYPE",
    "CAUSE",
    "COMMUNE",
    "CONDITIONS_LUMINEUSES",
    "CONDITIONS_METEO",
    "CONSEQUENCES",
    "NB_BLESSES_LEGERS",
    "NB_BLESSES_GRAVES",
    "NB_TUES",
    "NB_PIETONS",
    "NB_BICYCLETTES",
    "NB_VAE_25",
    "NB_VAE_45",
    "NB_TC",
    "TOTAL_PERSONNES",
    "stop_id",
    "stop_name",
    "network",
    "lines",
    "ring_label",
    "ring_from_m",
    "ring_to_m",
]


def clean_value(value: Any) -> Any:
    if value is None:
        return None
    if value is pd.NA:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if isinstance(value, str) and value in {"<NA>", "nan", "NaN"}:
        return None
    if isinstance(value, pd.Timestamp):
        if pd.isna(value):
            return None
        return value.isoformat()
    return value


def bool_value(value: Any) -> bool | None:
    value = clean_value(value)
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"true", "1", "yes", "y"}


def split_lines(value: Any) -> list[str]:
    value = clean_value(value)
    if value is None:
        return []
    lines = [item.strip().lstrip("0") or "0" for item in str(value).split(",") if item.strip()]
    return sorted(set(lines), key=lambda item: (not item.isdigit(), int(item) if item.isdigit() else item))


def category_for_osm(row: pd.Series) -> str:
    raw_category = clean_value(row.get("osm_category"))
    key = None
    tag = None

    if isinstance(raw_category, str) and ":" in raw_category:
        key, tag = raw_category.split(":", 1)

    candidates = [
        tag,
        clean_value(row.get("amenity")),
        clean_value(row.get("shop")),
        clean_value(row.get("healthcare")),
        clean_value(row.get("leisure")),
        clean_value(row.get("tourism")),
        clean_value(row.get("office")),
        clean_value(row.get("craft")),
        clean_value(row.get("public_transport")),
        clean_value(row.get("railway")),
        clean_value(row.get("emergency")),
    ]

    for candidate in candidates:
        if candidate in CATEGORY_BY_TAG:
            return CATEGORY_BY_TAG[str(candidate)]

    if key == "public_transport" or key == "railway":
        return "Transport"
    if key == "emergency":
        return "Safety"
    if key == "tourism":
        return "Tourism"
    if key == "office" or key == "craft":
        return "Services"
    if key == "shop":
        return "Shopping"
    if key == "healthcare":
        return "Care"
    return "Other"


def point_coordinates(geometry: Any) -> list[float] | None:
    if geometry is None or geometry.is_empty:
        return None
    point = geometry.centroid
    return [round(float(point.x), 7), round(float(point.y), 7)]


def normalized_text(value: Any) -> str:
    value = clean_value(value)
    if value is None:
        return ""
    return " ".join(str(value).casefold().strip().split())


def approximate_distance_m(a: list[float], b: list[float]) -> float:
    lat = math.radians((a[1] + b[1]) / 2)
    dx = (a[0] - b[0]) * 111_320 * math.cos(lat)
    dy = (a[1] - b[1]) * 110_540
    return math.hypot(dx, dy)


def feature_rank(feature: dict[str, Any]) -> tuple[int, int]:
    properties = feature["properties"]
    return (
        int(properties.get("ring_from_m", 999_999)),
        int(properties.get("ring_to_m", 999_999)),
    )


def deduplicate_equipment(features: list[dict[str, Any]], distance_m: float = 120) -> list[dict[str, Any]]:
    """Remove duplicate OSM representations of the same amenity for one stop.

    OSM often contains a node, a polygon and several building parts for the same
    named facility. We keep one representative per OSM id when available, and
    also merge same-name/same-category features that are very close spatially.
    """
    exact_by_osm_id: dict[str, dict[str, Any]] = {}
    without_osm_id: list[dict[str, Any]] = []
    named_clusters: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)

    for feature in features:
        properties = feature["properties"]
        osm_id = normalized_text(properties.get("osmid"))

        if osm_id:
            current = exact_by_osm_id.get(osm_id)
            if current is None or feature_rank(feature) < feature_rank(current):
                exact_by_osm_id[osm_id] = feature
            continue

        without_osm_id.append(feature)

    unnamed: list[dict[str, Any]] = []
    for feature in list(exact_by_osm_id.values()) + without_osm_id:
        properties = feature["properties"]
        name = normalized_text(properties.get("name"))
        category = normalized_text(properties.get("category"))
        category_id = normalized_text(properties.get("category_id"))

        if not name:
            unnamed.append(feature)
            continue

        cluster_key = (name, category_id if category_id == "transport" else category or category_id)
        coordinates = feature["geometry"]["coordinates"]
        cluster = named_clusters[cluster_key]
        max_distance_m = 180 if category_id == "transport" else distance_m
        duplicate_index = next(
            (
                index
                for index, candidate in enumerate(cluster)
                if approximate_distance_m(coordinates, candidate["geometry"]["coordinates"]) <= max_distance_m
            ),
            None,
        )

        if duplicate_index is None:
            cluster.append(feature)
            continue

        current = cluster[duplicate_index]
        kept = feature if feature_rank(feature) < feature_rank(current) else current
        duplicate_count = int(current["properties"].get("duplicate_count", 1)) + int(feature["properties"].get("duplicate_count", 1))
        kept["properties"]["duplicate_count"] = duplicate_count
        cluster[duplicate_index] = kept

    deduped = list(exact_by_osm_id.values()) + unnamed
    for cluster in named_clusters.values():
        deduped.extend(cluster)

    return deduped


def make_osm_feature(index: int, row: pd.Series) -> dict[str, Any] | None:
    coordinates = point_coordinates(row.geometry)
    if coordinates is None:
        return None

    category_id = category_for_osm(row)
    raw_category = clean_value(row.get("osm_category"))
    osm_key, osm_value = (raw_category.split(":", 1) if isinstance(raw_category, str) and ":" in raw_category else [None, raw_category])

    properties = {
        "id": f"osm-{clean_value(row.get('osmid')) or index}",
        "osmid": clean_value(row.get("osmid")),
        "kind": "equipment",
        "name": clean_value(row.get("name")),
        "category_id": category_id,
        "category": raw_category,
        "osm_key": osm_key,
        "osm_value": osm_value,
        "opening_hours": clean_value(row.get("opening_hours_raw")),
        "open_day": bool_value(row.get("open_day")),
        "open_night": bool_value(row.get("open_night")),
        "open_24h": bool_value(row.get("open_24h")),
        "ring_label": clean_value(row.get("ring_label")),
        "ring_from_m": clean_value(row.get("ring_from_m")),
        "ring_to_m": clean_value(row.get("ring_to_m")),
        "color": CATEGORY_COLORS[category_id],
    }

    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": coordinates},
        "properties": {key: value for key, value in properties.items() if value is not None},
    }


def make_accident_feature(index: int, row: pd.Series) -> dict[str, Any] | None:
    coordinates = point_coordinates(row.geometry)
    if coordinates is None:
        return None

    killed = int(clean_value(row.get("NB_TUES")) or 0)
    serious = int(clean_value(row.get("NB_BLESSES_GRAVES")) or 0)
    color = "#7f1d1d" if killed else "#dc2626" if serious else "#f97316"
    properties = {
        "id": f"accident-{clean_value(row.get('ID_ACCIDENT')) or index}",
        "kind": "accident",
        "category_id": "Accident",
        "name": clean_value(row.get("GROUPE_ACCIDENT")) or "Accident",
        "type": clean_value(row.get("TYPE")),
        "cause": clean_value(row.get("CAUSE")),
        "commune": clean_value(row.get("COMMUNE")),
        "date": clean_value(row.get("DATE_UTC")),
        "year": clean_value(row.get("ANNEE")),
        "hour": clean_value(row.get("HEURE")),
        "consequences": clean_value(row.get("CONSEQUENCES")),
        "injured_light": clean_value(row.get("NB_BLESSES_LEGERS")),
        "injured_serious": serious,
        "killed": killed,
        "pedestrians": clean_value(row.get("NB_PIETONS")),
        "bicycles": clean_value(row.get("NB_BICYCLETTES")),
        "public_transport": clean_value(row.get("NB_TC")),
        "ring_label": clean_value(row.get("ring_label")),
        "ring_from_m": clean_value(row.get("ring_from_m")),
        "ring_to_m": clean_value(row.get("ring_to_m")),
        "color": color,
    }

    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": coordinates},
        "properties": {key: value for key, value in properties.items() if value is not None},
    }


def read_geo_layer(path: Path, layer: str, columns: list[str]) -> gpd.GeoDataFrame:
    return gpd.read_file(path, layer=layer, columns=columns).to_crs("EPSG:4326")


def load_stations() -> dict[str, dict[str, Any]]:
    stations = gpd.read_file(STATIONS_INPUT).to_crs("EPSG:4326")
    result: dict[str, dict[str, Any]] = {}

    for _, row in stations.iterrows():
        stop_id = str(row["stop_id"])
        coordinates = point_coordinates(row.geometry)
        result[stop_id] = {
            "id": stop_id,
            "name": clean_value(row.get("name")),
            "network": clean_value(row.get("network")),
            "type": "Léman Express" if clean_value(row.get("network")) == "Léman Express" else "Arrêt TPG",
            "lines": split_lines(row.get("lines")),
            "coordinates": coordinates,
        }

    return result


def build_station_features() -> tuple[dict[str, list[dict[str, Any]]], dict[str, Counter], dict[str, Counter]]:
    features_by_stop: dict[str, list[dict[str, Any]]] = defaultdict(list)
    equipment_counts: dict[str, Counter] = defaultdict(Counter)
    accident_counts: dict[str, Counter] = defaultdict(Counter)
    equipment_by_stop: dict[str, list[dict[str, Any]]] = defaultdict(list)

    osm = read_geo_layer(OSM_INPUT, "osm_by_ring", OSM_COLUMNS)
    for index, row in osm.iterrows():
        stop_id = clean_value(row.get("stop_id"))
        if not stop_id:
            continue
        feature = make_osm_feature(index, row)
        if not feature:
            continue
        equipment_by_stop[str(stop_id)].append(feature)

    del osm

    for stop_id, features in equipment_by_stop.items():
        deduped_features = deduplicate_equipment(features)
        features_by_stop[stop_id].extend(deduped_features)
        for feature in deduped_features:
            category = feature["properties"].get("category_id", "Other")
            ring = feature["properties"].get("ring_label", "unknown")
            equipment_counts[stop_id][category] += 1
            equipment_counts[stop_id][f"ring:{ring}"] += 1

    accidents = read_geo_layer(ACCIDENT_INPUT, "accidents_by_ring", ACCIDENT_COLUMNS)
    for index, row in accidents.iterrows():
        stop_id = clean_value(row.get("stop_id"))
        if not stop_id:
            continue
        feature = make_accident_feature(index, row)
        if not feature:
            continue
        features_by_stop[str(stop_id)].append(feature)
        ring = feature["properties"].get("ring_label", "unknown")
        accident_counts[str(stop_id)]["total"] += 1
        accident_counts[str(stop_id)][f"ring:{ring}"] += 1
        if feature["properties"].get("injured_serious") or feature["properties"].get("killed"):
            accident_counts[str(stop_id)]["severe_or_fatal"] += 1

    return features_by_stop, equipment_counts, accident_counts


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


def export(output: Path) -> None:
    stations = load_stations()
    features_by_stop, equipment_counts, accident_counts = build_station_features()
    stops_dir = output / "stops"

    if output.exists():
        shutil.rmtree(output)
    stops_dir.mkdir(parents=True)

    for stop_id, station in stations.items():
        features = features_by_stop.get(stop_id, [])
        collection = {
            "type": "FeatureCollection",
            "metadata": {
                "station": station,
                "equipment_counts": dict(equipment_counts.get(stop_id, Counter())),
                "accident_counts": dict(accident_counts.get(stop_id, Counter())),
            },
            "features": features,
        }
        write_json(stops_dir / f"{stop_id}.geojson", collection)

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "format": "station-proximity-v1",
        "crs": "EPSG:4326",
        "rings_m": RING_ORDER,
        "categories": [
            {"id": category_id, "color": color}
            for category_id, color in CATEGORY_COLORS.items()
        ],
        "stations": {
            stop_id: {
                **station,
                "data_url": f"/data/stations-proximity/stops/{stop_id}.geojson",
                "equipment_count": sum(
                    count
                    for key, count in equipment_counts.get(stop_id, Counter()).items()
                    if not key.startswith("ring:")
                ),
                "accident_count": accident_counts.get(stop_id, Counter()).get("total", 0),
            }
            for stop_id, station in stations.items()
        },
    }
    write_json(output / "manifest.json", manifest)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output directory for web data")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    export(args.output)


if __name__ == "__main__":
    main()
