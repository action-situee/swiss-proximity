import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ProximityCategory } from '../lib/proximityData';
import {
  createCircle,
  fetchRegionalRailGraph,
  railGraphFallbackGeoJson,
  stationProximityGeoJson,
  type Station,
  type StationProximityData,
  type TimeMode,
} from '../lib/stationData';

interface TransportStationsMapProps {
  categories: ProximityCategory[];
  stations: Station[];
  selectedStation: Station | null;
  timeMode: TimeMode;
  proximityData: StationProximityData | null;
  isProximityLoading: boolean;
  onStationSelect: (station: Station) => void;
}

function createStationGeoJson(stations: Station[]) {
  return {
    type: 'FeatureCollection',
    features: stations.map(station => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: station.coordinates },
      properties: {
        id: station.id,
        name: station.name,
        type: station.type,
        lines: station.lines.join(', '),
        source: station.source,
      },
    })),
  };
}

const equipmentIconColors: Record<string, string> = {
  Education: '#7c3aed',
  Culture: '#c026d3',
  Care: '#db2777',
  Outdoor: '#16a34a',
  Sport: '#ea580c',
  Catering: '#dc2626',
  Provision: '#ca8a04',
  Shopping: '#0891b2',
  Public: '#475569',
  Transport: '#2563eb',
  UrbanFurniture: '#64748b',
  Parking: '#334155',
  Safety: '#b91c1c',
  Tourism: '#8b5cf6',
  Services: '#0f766e',
  Other: '#6b7280',
};

const equipmentCategoryLabels: Record<string, string> = {
  Education: 'Écoles et formation',
  Culture: 'Culture',
  Care: 'Santé et soins',
  Outdoor: 'Espaces publics',
  Sport: 'Sport',
  Catering: 'Restaurants et cafés',
  Provision: 'Commerces alimentaires',
  Shopping: 'Magasins',
  Public: 'Services publics',
  Transport: 'Transport',
  UrbanFurniture: 'Mobilier urbain',
  Parking: 'Stationnement',
  Safety: 'Sécurité',
  Tourism: 'Tourisme',
  Services: 'Services',
  Other: 'Autres équipements',
};

const equipmentIconIds = Object.fromEntries(
  Object.keys(equipmentIconColors).map(category => [category, `equipment-icon-${category.toLowerCase()}`]),
) as Record<string, string>;

const defaultVisibleEquipment = Object.fromEntries(
  Object.keys(equipmentIconColors).map(category => [category, true]),
) as Record<string, boolean>;

function equipmentLayerFilter(visibleEquipment: Record<string, boolean>) {
  const visibleCategories = Object.keys(equipmentIconColors).filter(category => visibleEquipment[category] !== false);

  return [
    'all',
    ['==', ['get', 'kind'], 'equipment'],
    ['match', ['get', 'category_id'], visibleCategories, true, false],
  ];
}

function registerEquipmentIcons(currentMap: maplibregl.Map) {
  Object.entries(equipmentIconColors).forEach(([category, color]) => {
    const imageId = equipmentIconIds[category];
    if (currentMap.hasImage(imageId)) return;
    currentMap.addImage(imageId, drawEquipmentIcon(category, color), { pixelRatio: 2 });
  });
}

function drawEquipmentIcon(category: string, color: string) {
  const size = 56;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponible');

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(28, 28, 23, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 4;

  if (category === 'Education') {
    ctx.beginPath();
    ctx.moveTo(15, 27);
    ctx.lineTo(28, 18);
    ctx.lineTo(41, 27);
    ctx.moveTo(19, 27);
    ctx.lineTo(19, 39);
    ctx.lineTo(37, 39);
    ctx.lineTo(37, 27);
    ctx.moveTo(28, 39);
    ctx.lineTo(28, 32);
    ctx.stroke();
  } else if (category === 'Culture') {
    ctx.beginPath();
    ctx.moveTo(16, 20);
    ctx.lineTo(40, 20);
    ctx.moveTo(18, 25);
    ctx.lineTo(38, 25);
    ctx.moveTo(21, 25);
    ctx.lineTo(21, 39);
    ctx.moveTo(28, 25);
    ctx.lineTo(28, 39);
    ctx.moveTo(35, 25);
    ctx.lineTo(35, 39);
    ctx.stroke();
  } else if (category === 'Care') {
    ctx.fillRect(25, 15, 6, 26);
    ctx.fillRect(15, 25, 26, 6);
  } else if (category === 'Outdoor') {
    ctx.beginPath();
    ctx.moveTo(28, 39);
    ctx.lineTo(28, 27);
    ctx.moveTo(19, 33);
    ctx.lineTo(28, 18);
    ctx.lineTo(37, 33);
    ctx.moveTo(22, 27);
    ctx.lineTo(34, 27);
    ctx.stroke();
  } else if (category === 'Sport') {
    ctx.beginPath();
    ctx.arc(28, 28, 13, 0, Math.PI * 2);
    ctx.moveTo(15, 28);
    ctx.lineTo(41, 28);
    ctx.moveTo(28, 15);
    ctx.bezierCurveTo(22, 22, 22, 34, 28, 41);
    ctx.moveTo(28, 15);
    ctx.bezierCurveTo(34, 22, 34, 34, 28, 41);
    ctx.stroke();
  } else if (category === 'Catering') {
    ctx.beginPath();
    ctx.moveTo(21, 16);
    ctx.lineTo(21, 40);
    ctx.moveTo(17, 16);
    ctx.lineTo(17, 25);
    ctx.moveTo(25, 16);
    ctx.lineTo(25, 25);
    ctx.moveTo(34, 17);
    ctx.lineTo(34, 40);
    ctx.moveTo(34, 17);
    ctx.quadraticCurveTo(42, 22, 34, 29);
    ctx.stroke();
  } else if (category === 'Provision') {
    ctx.beginPath();
    ctx.moveTo(16, 26);
    ctx.lineTo(40, 26);
    ctx.lineTo(36, 39);
    ctx.lineTo(20, 39);
    ctx.closePath();
    ctx.moveTo(22, 26);
    ctx.quadraticCurveTo(28, 14, 34, 26);
    ctx.stroke();
  } else if (category === 'Shopping') {
    ctx.beginPath();
    ctx.rect(18, 24, 20, 17);
    ctx.moveTo(23, 24);
    ctx.quadraticCurveTo(28, 14, 33, 24);
    ctx.stroke();
  } else if (category === 'Public') {
    ctx.beginPath();
    ctx.moveTo(16, 24);
    ctx.lineTo(28, 17);
    ctx.lineTo(40, 24);
    ctx.moveTo(18, 39);
    ctx.lineTo(38, 39);
    ctx.moveTo(21, 25);
    ctx.lineTo(21, 37);
    ctx.moveTo(28, 25);
    ctx.lineTo(28, 37);
    ctx.moveTo(35, 25);
    ctx.lineTo(35, 37);
    ctx.stroke();
  } else if (category === 'Transport') {
    ctx.beginPath();
    ctx.rect(17, 17, 22, 21);
    ctx.moveTo(21, 38);
    ctx.lineTo(21, 42);
    ctx.moveTo(35, 38);
    ctx.lineTo(35, 42);
    ctx.moveTo(20, 25);
    ctx.lineTo(36, 25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(22, 33, 2, 0, Math.PI * 2);
    ctx.arc(34, 33, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (category === 'UrbanFurniture') {
    ctx.beginPath();
    ctx.moveTo(17, 31);
    ctx.lineTo(39, 31);
    ctx.moveTo(20, 23);
    ctx.lineTo(20, 39);
    ctx.moveTo(36, 23);
    ctx.lineTo(36, 39);
    ctx.moveTo(20, 38);
    ctx.lineTo(36, 38);
    ctx.stroke();
  } else if (category === 'Parking') {
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', 28, 29);
  } else if (category === 'Safety') {
    ctx.beginPath();
    ctx.moveTo(28, 16);
    ctx.lineTo(38, 21);
    ctx.lineTo(36, 34);
    ctx.quadraticCurveTo(28, 42, 20, 34);
    ctx.lineTo(18, 21);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(28, 23);
    ctx.lineTo(28, 34);
    ctx.moveTo(22, 28);
    ctx.lineTo(34, 28);
    ctx.stroke();
  } else if (category === 'Tourism') {
    ctx.font = 'bold 27px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('i', 28, 30);
  } else if (category === 'Services') {
    ctx.beginPath();
    ctx.rect(17, 23, 22, 16);
    ctx.moveTo(24, 23);
    ctx.lineTo(24, 19);
    ctx.lineTo(32, 19);
    ctx.lineTo(32, 23);
    ctx.moveTo(17, 30);
    ctx.lineTo(39, 30);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(28, 28, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  return ctx.getImageData(0, 0, size, size);
}

export function TransportStationsMap({
  categories,
  stations,
  selectedStation,
  timeMode,
  proximityData,
  isProximityLoading,
  onStationSelect,
}: TransportStationsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const popup = useRef(new Popup({ closeButton: false, maxWidth: '280px' }));
  const latestStations = useRef(stations);
  const hasProximityHandlers = useRef(false);
  const lastCenteredStationId = useRef<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [railGraphData, setRailGraphData] = useState<any>(railGraphFallbackGeoJson);
  const [visibleEquipment, setVisibleEquipment] = useState<Record<string, boolean>>(defaultVisibleEquipment);
  const [showAccidentDensity, setShowAccidentDensity] = useState(true);
  const [showAccidentPoints, setShowAccidentPoints] = useState(false);

  const poiData = useMemo(
    () => stationProximityGeoJson(proximityData, [], timeMode),
    [proximityData, timeMode],
  );
  const stationData = useMemo(() => createStationGeoJson(stations), [stations]);

  useEffect(() => {
    latestStations.current = stations;
  }, [stations]);

  useEffect(() => {
    let isMounted = true;

    fetchRegionalRailGraph()
      .then((data) => {
        if (isMounted) setRailGraphData(data);
      })
      .catch((error) => {
        console.error('Fallback lignes droites Léman Express', error);
        if (isMounted) setRailGraphData(railGraphFallbackGeoJson);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: '/styles/lightbase.json',
      center: [6.1432, 46.2044],
      zoom: 12,
      minZoom: 10,
      maxBounds: [5.9, 46.05, 6.35, 46.32],
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-left');
    map.current.on('load', () => setMapLoaded(true));

    return () => {
      popup.current.remove();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded) return;

    if (!currentMap.getSource('transit-lines')) {
      currentMap.addSource('transit-lines', {
        type: 'geojson',
        data: railGraphData as GeoJSON.FeatureCollection,
      });

      currentMap.addLayer({
        id: 'transit-lines',
        type: 'line',
        source: 'transit-lines',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'TYPE_VOIE'], 'Tramway'],
            '#111827',
            '#2563eb',
          ],
          'line-width': [
            'case',
            ['==', ['get', 'TYPE_VOIE'], 'Tramway'],
            1.7,
            3.2,
          ],
          'line-opacity': timeMode === 'night' ? 0.42 : 0.68,
        },
      });
    }

    if (!currentMap.getSource('transport-stations')) {
      currentMap.addSource('transport-stations', {
        type: 'geojson',
        data: stationData as GeoJSON.FeatureCollection,
      });

      currentMap.addLayer({
        id: 'transport-stations',
        type: 'circle',
        source: 'transport-stations',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'id'], selectedStation?.id ?? ''], 10, 6],
          'circle-color': [
            'case',
            ['==', ['get', 'id'], selectedStation?.id ?? ''],
            '#dc2626',
            ['==', ['get', 'type'], 'Léman Express'],
            '#2563eb',
            '#111827',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      currentMap.addLayer({
        id: 'transport-station-labels',
        type: 'symbol',
        source: 'transport-stations',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#111827',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });

      currentMap.on('mouseenter', 'transport-stations', () => {
        currentMap.getCanvas().style.cursor = 'pointer';
      });

      currentMap.on('mouseleave', 'transport-stations', () => {
        currentMap.getCanvas().style.cursor = '';
        popup.current.remove();
      });

      currentMap.on('mousemove', 'transport-stations', (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const properties = feature.properties ?? {};

        popup.current
          .setLngLat(event.lngLat)
          .setHTML(`<strong>${properties.name}</strong><br/><span>${properties.type} · ${properties.lines}</span>`)
          .addTo(currentMap);
      });

      currentMap.on('click', 'transport-stations', (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const station = latestStations.current.find(item => item.id === feature.properties?.id);
        if (!station) return;

        onStationSelect(station);
      });
    }
  }, [mapLoaded, onStationSelect, railGraphData, selectedStation?.id, stationData, stations, timeMode]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded) return;

    if (currentMap.getSource('transit-lines')) {
      (currentMap.getSource('transit-lines') as maplibregl.GeoJSONSource).setData(railGraphData as GeoJSON.FeatureCollection);
    }
  }, [mapLoaded, railGraphData]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded) return;

    if (currentMap.getSource('transport-stations')) {
      (currentMap.getSource('transport-stations') as maplibregl.GeoJSONSource).setData(stationData as GeoJSON.FeatureCollection);
    }

    if (stations.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      stations.forEach(station => bounds.extend(station.coordinates));
      currentMap.fitBounds(bounds, { padding: 60, duration: 700 });
    }
  }, [mapLoaded, stationData, stations]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded || !selectedStation) return;
    if (lastCenteredStationId.current === selectedStation.id) return;

    lastCenteredStationId.current = selectedStation.id;
    currentMap.flyTo({
      center: selectedStation.coordinates,
      zoom: Math.max(currentMap.getZoom(), 14.2),
      duration: 700,
    });
  }, [mapLoaded, selectedStation]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded) return;

    if (currentMap.getLayer('transport-stations')) {
      currentMap.setPaintProperty('transport-stations', 'circle-radius', ['case', ['==', ['get', 'id'], selectedStation?.id ?? ''], 10, 6]);
      currentMap.setPaintProperty('transport-stations', 'circle-color', [
        'case',
        ['==', ['get', 'id'], selectedStation?.id ?? ''],
        '#dc2626',
        ['==', ['get', 'type'], 'Léman Express'],
        '#2563eb',
        '#111827',
      ]);
    }

    if (currentMap.getLayer('transit-lines')) {
      currentMap.setPaintProperty('transit-lines', 'line-opacity', timeMode === 'night' ? 0.42 : 0.68);
    }
  }, [mapLoaded, selectedStation?.id, timeMode]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded || !selectedStation) return;

    [
      'influence-800-outline',
      'influence-300-outline',
      'influence-800',
      'influence-300',
      'station-equipment',
      'station-accidents-density',
      'station-accident-points',
      'station-pois',
    ].forEach((id) => {
      if (currentMap.getLayer(id)) currentMap.removeLayer(id);
      if (currentMap.getSource(id)) currentMap.removeSource(id);
    });

    registerEquipmentIcons(currentMap);

    [
      { id: 'influence-800', meters: 800, color: '#2563eb', opacity: timeMode === 'night' ? 0.05 : 0.08 },
      { id: 'influence-300', meters: 300, color: '#dc2626', opacity: timeMode === 'night' ? 0.08 : 0.12 },
    ].forEach(({ id, meters, color, opacity }) => {
      currentMap.addSource(id, {
        type: 'geojson',
        data: createCircle(selectedStation.coordinates, meters) as GeoJSON.Feature,
      });

      currentMap.addLayer({
        id,
        type: 'fill',
        source: id,
        paint: {
          'fill-color': color,
          'fill-opacity': opacity,
        },
      }, 'transport-stations');

      currentMap.addLayer({
        id: `${id}-outline`,
        type: 'line',
        source: id,
        paint: {
          'line-color': color,
          'line-width': 2,
          'line-dasharray': [4, 4],
        },
      }, 'transport-stations');
    });

    currentMap.addSource('station-pois', {
      type: 'geojson',
      data: poiData as GeoJSON.FeatureCollection,
    });

    currentMap.addLayer({
      id: 'station-accidents-density',
      type: 'heatmap',
      source: 'station-pois',
      filter: ['==', ['get', 'kind'], 'accident'],
      layout: { visibility: showAccidentDensity ? 'visible' : 'none' },
      paint: {
        'heatmap-weight': [
          'case',
          ['>', ['coalesce', ['to-number', ['get', 'killed']], 0], 0],
          1,
          ['>', ['coalesce', ['to-number', ['get', 'injured_serious']], 0], 0],
          0.72,
          0.36,
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          1.05,
          12,
          1.28,
          15,
          1.65,
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          6,
          12,
          10,
          15,
          22,
        ],
        'heatmap-opacity': timeMode === 'night' ? 0.5 : 0.7,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(255,255,255,0)',
          0.24,
          '#fee2e2',
          0.52,
          '#f87171',
          0.78,
          '#dc2626',
          1,
          '#7f1d1d',
        ],
      },
    }, 'transport-stations');

    currentMap.addLayer({
      id: 'station-accident-points',
      type: 'circle',
      source: 'station-pois',
      filter: ['==', ['get', 'kind'], 'accident'],
      minzoom: 14,
      layout: { visibility: showAccidentPoints ? 'visible' : 'none' },
      paint: {
        'circle-radius': [
          'case',
          ['>', ['coalesce', ['to-number', ['get', 'killed']], 0], 0],
          5.5,
          ['>', ['coalesce', ['to-number', ['get', 'injured_serious']], 0], 0],
          4.5,
          3.5,
        ],
        'circle-color': ['get', 'color'],
        'circle-opacity': timeMode === 'night' ? 0.18 : 0.26,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
      },
    }, 'transport-stations');

    currentMap.addLayer({
      id: 'station-equipment',
      type: 'symbol',
      source: 'station-pois',
      filter: equipmentLayerFilter(visibleEquipment),
      layout: {
        'icon-image': [
          'match',
          ['get', 'category_id'],
          ...Object.entries(equipmentIconIds).flatMap(([category, iconId]) => [category, iconId]),
          equipmentIconIds.Other,
        ],
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          11,
          0.42,
          15,
          0.68,
        ],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: {
        'icon-opacity': timeMode === 'night' ? 0.68 : 0.92,
      },
    }, 'transport-stations');

    if (!hasProximityHandlers.current) {
      hasProximityHandlers.current = true;

      ['station-equipment', 'station-accident-points'].forEach((layerId) => {
        currentMap.on('mouseenter', layerId, () => {
          currentMap.getCanvas().style.cursor = 'pointer';
        });

        currentMap.on('mouseleave', layerId, () => {
          currentMap.getCanvas().style.cursor = '';
          popup.current.remove();
        });

        currentMap.on('mousemove', layerId, (event) => {
          const feature = event.features?.[0];
          if (!feature) return;

          popup.current
            .setLngLat(event.lngLat)
            .setHTML(proximityPopupHtml(feature.properties ?? {}))
            .addTo(currentMap);
        });
      });
    }
  }, [mapLoaded, poiData, selectedStation, timeMode]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded) return;

    if (currentMap.getLayer('station-equipment')) {
      currentMap.setFilter('station-equipment', equipmentLayerFilter(visibleEquipment) as any);
    }

    if (currentMap.getLayer('station-accidents-density')) {
      currentMap.setLayoutProperty('station-accidents-density', 'visibility', showAccidentDensity ? 'visible' : 'none');
    }

    if (currentMap.getLayer('station-accident-points')) {
      currentMap.setLayoutProperty('station-accident-points', 'visibility', showAccidentPoints ? 'visible' : 'none');
    }
  }, [mapLoaded, showAccidentDensity, showAccidentPoints, visibleEquipment]);

  return (
    <div className="relative h-full w-full bg-gray-100">
      <div ref={mapContainer} className="h-full w-full" />
      <div className="absolute left-4 top-4 border border-gray-400 bg-white px-3 py-2 text-xs text-gray-700">
        <div className="font-medium text-gray-900">Arrêts TP</div>
        <div>{timeMode === 'day' ? 'Jour' : timeMode === 'night' ? 'Nuit' : '24h'} · {isProximityLoading ? 'chargement équipements' : 'équipements par arrêt'}</div>
      </div>
      <div className="absolute bottom-4 left-4 max-w-[290px] border border-gray-400 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm">
        <div className="mb-2 font-medium text-gray-900">Équipements et accidents</div>
        <button
          type="button"
          onClick={() => setShowAccidentDensity(value => !value)}
          aria-pressed={showAccidentDensity}
          className={`mb-1.5 flex w-full items-center gap-2 text-left transition-opacity ${showAccidentDensity ? 'opacity-100' : 'opacity-35'}`}
        >
          <span className="h-3 w-10 rounded-full bg-gradient-to-r from-[#fee2e2] via-[#f87171] to-[#7f1d1d]" />
          <span>Densité d'accidents</span>
        </button>
        <button
          type="button"
          onClick={() => setShowAccidentPoints(value => !value)}
          aria-pressed={showAccidentPoints}
          className={`mb-2 flex w-full items-center gap-2 text-left transition-opacity ${showAccidentPoints ? 'opacity-100' : 'opacity-35'}`}
        >
          <span className="h-3 w-3 rounded-full border border-white bg-red-700 shadow-sm" />
          <span>Accidents en points</span>
        </button>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {Object.entries(equipmentCategoryLabels).map(([id, label]) => {
            const isVisible = visibleEquipment[id] !== false;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setVisibleEquipment(prev => ({ ...prev, [id]: prev[id] === false }))}
                aria-pressed={isVisible}
                className={`flex min-w-0 items-center gap-1.5 text-left transition-opacity ${isVisible ? 'opacity-100' : 'opacity-35'}`}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: equipmentIconColors[id] }} />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs uppercase tracking-wider text-gray-500">
          Chargement des arrêts
        </div>
      )}
    </div>
  );
}

function proximityPopupHtml(properties: Record<string, any>) {
  if (properties.kind === 'accident') {
    const injuries = [
      Number(properties.killed) > 0 ? `${properties.killed} tué(s)` : null,
      Number(properties.injured_serious) > 0 ? `${properties.injured_serious} blessé(s) grave(s)` : null,
      Number(properties.injured_light) > 0 ? `${properties.injured_light} blessé(s) léger(s)` : null,
    ].filter(Boolean).join(' · ');

    return [
      `<strong>${escapeHtml(properties.name ?? 'Accident')}</strong>`,
      properties.year ? `<span>${escapeHtml(String(properties.year))}${properties.ring_label ? ` · ${escapeHtml(properties.ring_label)}` : ''}</span>` : null,
      properties.consequences ? `<span>${escapeHtml(properties.consequences)}</span>` : null,
      injuries ? `<span>${escapeHtml(injuries)}</span>` : null,
    ].filter(Boolean).join('<br/>');
  }

  const categoryId = properties.category_id ?? 'Other';
  const categoryLabel = equipmentCategoryLabels[categoryId] ?? categoryId;
  const osmLabel = properties.category ? ` · ${String(properties.category).replace(':', ' / ')}` : '';

  return [
    `<strong>${escapeHtml(properties.name ?? properties.category ?? 'Équipement')}</strong>`,
    `<span>${escapeHtml(categoryLabel)}${escapeHtml(osmLabel)}${properties.ring_label ? ` · ${escapeHtml(properties.ring_label)}` : ''}</span>`,
    properties.opening_hours ? `<span>${escapeHtml(properties.opening_hours)}</span>` : null,
  ].filter(Boolean).join('<br/>');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
