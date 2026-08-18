import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ProximityCategory } from '../lib/proximityData';
import {
  accessibilityRings,
  createCircle,
  fetchRegionalRailGraph,
  railGraphFallbackGeoJson,
  sitgThematicLayers,
  stationAnalysisThemes,
  sitgEquipmentLayers,
  stationProximityGeoJson,
  type Station,
  type StationAnalysisThemeId,
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
  activeAnalysisTheme: StationAnalysisThemeId;
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

const equipmentIconColors: Record<string, string> = Object.fromEntries(
  sitgEquipmentLayers.map(layer => [layer.id, layer.color]),
);

const equipmentCategoryLabels: Record<string, string> = Object.fromEntries(
  [...sitgEquipmentLayers, ...sitgThematicLayers].map(layer => [layer.id, layer.label]),
);

const equipmentIconIds = Object.fromEntries(
  Object.keys(equipmentIconColors).map(category => [category, `equipment-icon-${category.toLowerCase()}`]),
) as Record<string, string>;

const stationIconIds = {
  selected: 'transport-station-square-selected',
  leman: 'transport-station-square-leman',
  tram: 'transport-station-square-tram',
} as const;

const defaultVisibleEquipment = Object.fromEntries(
  Object.keys(equipmentIconColors).map(category => [category, true]),
) as Record<string, boolean>;

const thematicLayerColors: Record<string, string> = Object.fromEntries(
  sitgThematicLayers.map(layer => [layer.id, layer.color]),
);

const defaultVisibleThematicLayers = Object.fromEntries(
  sitgThematicLayers.map(layer => [layer.id, true]),
) as Record<string, boolean>;

function equipmentLayerFilter(visibleEquipment: Record<string, boolean>) {
  const visibleCategories = Object.keys(equipmentIconColors).filter(category => visibleEquipment[category] !== false);

  return [
    'all',
    ['==', ['get', 'kind'], 'equipment'],
    ['match', ['get', 'category_id'], visibleCategories, true, false],
  ];
}

function thematicLayerFilter(
  visibleThematicLayers: Record<string, boolean>,
  geometryTypes: string[],
) {
  const visibleCategories = Object.keys(thematicLayerColors).filter(category => visibleThematicLayers[category] !== false);

  return [
    'all',
    ['==', ['get', 'kind'], 'thematic'],
    ['match', ['geometry-type'], geometryTypes, true, false],
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

function registerStationIcons(currentMap: maplibregl.Map) {
  const icons = [
    [stationIconIds.selected, '#dc2626'],
    [stationIconIds.leman, '#2563eb'],
    [stationIconIds.tram, '#111827'],
  ] as const;

  icons.forEach(([imageId, color]) => {
    if (currentMap.hasImage(imageId)) return;
    currentMap.addImage(imageId, drawStationSquareIcon(color), { pixelRatio: 2 });
  });
}

function stationIconImageExpression(selectedStationId?: string) {
  return [
    'case',
    ['==', ['get', 'id'], selectedStationId ?? ''],
    stationIconIds.selected,
    ['==', ['get', 'type'], 'Léman Express'],
    stationIconIds.leman,
    stationIconIds.tram,
  ];
}

function stationIconSizeExpression(selectedStationId?: string) {
  return ['case', ['==', ['get', 'id'], selectedStationId ?? ''], 0.88, 0.68];
}

function drawStationSquareIcon(color: string) {
  const size = 48;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponible');

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.rect(10, 10, 28, 28);
  ctx.fill();
  ctx.stroke();

  return ctx.getImageData(0, 0, size, size);
}

function equipmentIconKind(category: string) {
  if (category === 'PrimarySchool' || category === 'College') return 'Education';
  if (category === 'CarePlace') return 'Care';
  if (category === 'SportFacility') return 'Sport';
  if (category === 'MajorRetail') return 'Shopping';
  if (category === 'PostOffice') return 'Services';
  if (category === 'ParkRide') return 'Parking';
  if (category === 'Lighting') return 'Safety';

  return category;
}

function drawEquipmentIcon(category: string, color: string) {
  const iconKind = equipmentIconKind(category);
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

  if (iconKind === 'Education') {
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
  } else if (iconKind === 'Culture') {
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
  } else if (iconKind === 'Care') {
    ctx.fillRect(25, 15, 6, 26);
    ctx.fillRect(15, 25, 26, 6);
  } else if (iconKind === 'Outdoor') {
    ctx.beginPath();
    ctx.moveTo(28, 39);
    ctx.lineTo(28, 27);
    ctx.moveTo(19, 33);
    ctx.lineTo(28, 18);
    ctx.lineTo(37, 33);
    ctx.moveTo(22, 27);
    ctx.lineTo(34, 27);
    ctx.stroke();
  } else if (iconKind === 'Sport') {
    ctx.beginPath();
    ctx.arc(28, 28, 13, 0, Math.PI * 2);
    ctx.moveTo(15, 28);
    ctx.lineTo(41, 28);
    ctx.moveTo(28, 15);
    ctx.bezierCurveTo(22, 22, 22, 34, 28, 41);
    ctx.moveTo(28, 15);
    ctx.bezierCurveTo(34, 22, 34, 34, 28, 41);
    ctx.stroke();
  } else if (iconKind === 'Catering') {
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
  } else if (iconKind === 'Provision') {
    ctx.beginPath();
    ctx.moveTo(16, 26);
    ctx.lineTo(40, 26);
    ctx.lineTo(36, 39);
    ctx.lineTo(20, 39);
    ctx.closePath();
    ctx.moveTo(22, 26);
    ctx.quadraticCurveTo(28, 14, 34, 26);
    ctx.stroke();
  } else if (iconKind === 'Shopping') {
    ctx.beginPath();
    ctx.rect(18, 24, 20, 17);
    ctx.moveTo(23, 24);
    ctx.quadraticCurveTo(28, 14, 33, 24);
    ctx.stroke();
  } else if (iconKind === 'Public') {
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
  } else if (iconKind === 'Transport') {
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
  } else if (iconKind === 'UrbanFurniture') {
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
  } else if (iconKind === 'Parking') {
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', 28, 29);
  } else if (iconKind === 'Safety') {
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
  } else if (iconKind === 'Tourism') {
    ctx.font = 'bold 27px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('i', 28, 30);
  } else if (iconKind === 'Services') {
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
  activeAnalysisTheme,
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
  const [visibleThematicLayers, setVisibleThematicLayers] = useState<Record<string, boolean>>(defaultVisibleThematicLayers);
  const [visibleRings, setVisibleRings] = useState<Record<string, boolean>>({
    250: true,
    500: true,
    750: true,
    1000: true,
  });
  const [showRailLines, setShowRailLines] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showAccidentDensity, setShowAccidentDensity] = useState(true);
  const [showAccidentPoints, setShowAccidentPoints] = useState(false);
  const [accidentUserFilter, setAccidentUserFilter] = useState<'all' | 'pedestrian' | 'bike'>('all');
  const [accidentSeverityFilter, setAccidentSeverityFilter] = useState<'all' | 'severe'>('all');
  const [minAccidentYear, setMinAccidentYear] = useState(2010);
  const [showLayerLegend, setShowLayerLegend] = useState(false);
  const [show3d, setShow3d] = useState(false);
  const show3dRef = useRef(false);

  const poiData = useMemo(
    () => filterStationPois(stationProximityGeoJson(proximityData, [], timeMode), accidentUserFilter, accidentSeverityFilter, minAccidentYear),
    [accidentSeverityFilter, accidentUserFilter, minAccidentYear, proximityData, timeMode],
  );
  const stationData = useMemo(() => createStationGeoJson(stations), [stations]);
  const activeTheme = stationAnalysisThemes.find(theme => theme.id === activeAnalysisTheme) ?? stationAnalysisThemes[0];

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
    setVisibleEquipment(Object.fromEntries(
      sitgEquipmentLayers.map(layer => [layer.id, activeTheme.equipmentLayerIds.includes(layer.id)]),
    ) as Record<string, boolean>);
    setVisibleThematicLayers(Object.fromEntries(
      sitgThematicLayers.map(layer => [layer.id, activeTheme.thematicLayerIds.includes(layer.id)]),
    ) as Record<string, boolean>);
    setShowAccidentDensity(activeTheme.showAccidentDensity);
    setShowAccidentPoints(activeTheme.showAccidentPoints);
  }, [activeTheme]);

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
            ['==', ['get', 'TYPE_VOIE'], 'tram'],
            '#f39200',
            '#eb0000',
          ],
          'line-width': [
            'case',
            ['==', ['get', 'TYPE_VOIE'], 'tram'],
            2.8,
            3.2,
          ],
          'line-opacity': timeMode === 'night' ? 0.42 : 0.68,
        },
        layout: { visibility: showRailLines ? 'visible' : 'none' },
      });
    }

    if (!currentMap.getSource('transport-stations')) {
      registerStationIcons(currentMap);

      currentMap.addSource('transport-stations', {
        type: 'geojson',
        data: stationData as GeoJSON.FeatureCollection,
      });

      currentMap.addLayer({
        id: 'transport-stations',
        type: 'symbol',
        source: 'transport-stations',
        layout: {
          visibility: showStations ? 'visible' : 'none',
          'icon-image': stationIconImageExpression(selectedStation?.id),
          'icon-size': stationIconSizeExpression(selectedStation?.id),
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });

      currentMap.addLayer({
        id: 'transport-station-labels',
        type: 'symbol',
        source: 'transport-stations',
        layout: {
          visibility: showStations ? 'visible' : 'none',
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
  }, [mapLoaded, onStationSelect, railGraphData, selectedStation?.id, showRailLines, showStations, stationData, stations, timeMode]);

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
      currentMap.setLayoutProperty('transport-stations', 'icon-image', stationIconImageExpression(selectedStation?.id));
      currentMap.setLayoutProperty('transport-stations', 'icon-size', stationIconSizeExpression(selectedStation?.id));
    }

    if (currentMap.getLayer('transit-lines')) {
      currentMap.setPaintProperty('transit-lines', 'line-opacity', timeMode === 'night' ? 0.42 : 0.68);
      currentMap.setLayoutProperty('transit-lines', 'visibility', showRailLines ? 'visible' : 'none');
    }

    ['transport-stations', 'transport-station-labels'].forEach((layerId) => {
      if (currentMap.getLayer(layerId)) currentMap.setLayoutProperty(layerId, 'visibility', showStations ? 'visible' : 'none');
    });
  }, [mapLoaded, selectedStation?.id, showRailLines, showStations, timeMode]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded) return;

    accessibilityRings.forEach((ring) => {
      const visibility = visibleRings[ring.id] === false ? 'none' : 'visible';
      [`access-ring-${ring.id}`, `access-ring-${ring.id}-outline`].forEach((layerId) => {
        if (currentMap.getLayer(layerId)) currentMap.setLayoutProperty(layerId, 'visibility', visibility);
      });
    });
  }, [mapLoaded, visibleRings]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded || !selectedStation) return;

    accessibilityRings.forEach((ring) => {
      const source = currentMap.getSource(`access-ring-${ring.id}`) as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData(createCircle(selectedStation.coordinates, ring.to) as GeoJSON.Feature);
    });
  }, [mapLoaded, selectedStation]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded || !selectedStation) return;

    [
      'station-equipment',
      'station-thematic-polygons',
      'station-thematic-lines',
      'station-thematic-points',
      'station-accidents-density',
      'station-accident-points',
      'station-pois',
      ...accessibilityRings.flatMap(ring => [`access-ring-${ring.id}-outline`, `access-ring-${ring.id}`]),
    ].forEach((id) => {
      if (currentMap.getLayer(id)) currentMap.removeLayer(id);
      if (currentMap.getSource(id)) currentMap.removeSource(id);
    });

    registerEquipmentIcons(currentMap);

    accessibilityRings.forEach((ring) => {
      const id = `access-ring-${ring.id}`;
      currentMap.addSource(id, {
        type: 'geojson',
        data: createCircle(selectedStation.coordinates, ring.to) as GeoJSON.Feature,
      });

      currentMap.addLayer({
        id,
        type: 'fill',
        source: id,
        layout: { visibility: visibleRings[ring.id] === false ? 'none' : 'visible' },
        paint: {
          'fill-color': ring.fill,
          'fill-opacity': timeMode === 'night' ? ring.opacity * 0.62 : ring.opacity,
        },
      }, 'transport-stations');

      currentMap.addLayer({
        id: `${id}-outline`,
        type: 'line',
        source: id,
        layout: { visibility: visibleRings[ring.id] === false ? 'none' : 'visible' },
        paint: {
          'line-color': ring.line,
          'line-width': 2,
        },
      }, 'transport-stations');
    });

    currentMap.addSource('station-pois', {
      type: 'geojson',
      data: poiData as GeoJSON.FeatureCollection,
    });

    currentMap.addLayer({
      id: 'station-thematic-polygons',
      type: 'fill',
      source: 'station-pois',
      filter: thematicLayerFilter(visibleThematicLayers, ['Polygon', 'MultiPolygon']) as any,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': timeMode === 'night' ? 0.2 : 0.28,
        'fill-outline-color': ['get', 'color'],
      },
    }, 'transport-stations');

    currentMap.addLayer({
      id: 'station-thematic-lines',
      type: 'line',
      source: 'station-pois',
      filter: thematicLayerFilter(visibleThematicLayers, ['LineString', 'MultiLineString']) as any,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          11,
          1.2,
          15,
          3.2,
        ],
        'line-opacity': timeMode === 'night' ? 0.58 : 0.84,
      },
    }, 'transport-stations');

    currentMap.addLayer({
      id: 'station-thematic-points',
      type: 'circle',
      source: 'station-pois',
      filter: thematicLayerFilter(visibleThematicLayers, ['Point', 'MultiPoint']) as any,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          11,
          3,
          15,
          5.5,
        ],
        'circle-color': ['get', 'color'],
        'circle-opacity': timeMode === 'night' ? 0.62 : 0.9,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
      },
    }, 'transport-stations');

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
          equipmentIconIds.PrimarySchool,
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

      ['station-equipment', 'station-accident-points', 'station-thematic-polygons', 'station-thematic-lines', 'station-thematic-points'].forEach((layerId) => {
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

    if (currentMap.getLayer('station-thematic-polygons')) {
      currentMap.setFilter('station-thematic-polygons', thematicLayerFilter(visibleThematicLayers, ['Polygon', 'MultiPolygon']) as any);
    }

    if (currentMap.getLayer('station-thematic-lines')) {
      currentMap.setFilter('station-thematic-lines', thematicLayerFilter(visibleThematicLayers, ['LineString', 'MultiLineString']) as any);
    }

    if (currentMap.getLayer('station-thematic-points')) {
      currentMap.setFilter('station-thematic-points', thematicLayerFilter(visibleThematicLayers, ['Point', 'MultiPoint']) as any);
    }

    if (currentMap.getLayer('station-accidents-density')) {
      currentMap.setLayoutProperty('station-accidents-density', 'visibility', showAccidentDensity ? 'visible' : 'none');
    }

    if (currentMap.getLayer('station-accident-points')) {
      currentMap.setLayoutProperty('station-accident-points', 'visibility', showAccidentPoints ? 'visible' : 'none');
    }
  }, [mapLoaded, showAccidentDensity, showAccidentPoints, visibleEquipment, visibleThematicLayers]);

  useEffect(() => { show3dRef.current = show3d; }, [show3d]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded) return;
    try {
      if (show3d) {
        if (!currentMap.getSource('terrain-dem')) {
          currentMap.addSource('terrain-dem', {
            type: 'raster-dem',
            url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
            tileSize: 256,
          });
        }
        currentMap.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 });
        currentMap.setSky({
          'sky-color': '#1565c0',
          'horizon-color': '#c5d8e8',
          'fog-color': '#e4eff8',
          'fog-ground-blend': 0.5,
          'atmosphere-blend': 0.85,
        });
        currentMap.flyTo({ pitch: 55, bearing: -20, duration: 600 });
      } else {
        currentMap.setTerrain(null);
        currentMap.setSky({ 'atmosphere-blend': 0 });
        currentMap.flyTo({ pitch: 0, bearing: 0, duration: 500 });
      }
    } catch (err) {
      console.warn('3D terrain:', err);
    }
  }, [show3d, mapLoaded]);

  return (
    <div className="relative h-full w-full bg-gray-100">
      <div ref={mapContainer} className="h-full w-full" />
      <div className="absolute left-4 top-4 border border-gray-400 bg-white px-3 py-2 text-xs text-gray-700">
        <div className="font-medium text-gray-900">Arrêts Léman Express et tram</div>
        <div>{stations.length} arrêts SITG · {isProximityLoading ? 'chargement SITG' : 'analyse 1000 m'}</div>
      </div>
      <div className="absolute bottom-4 left-4 flex gap-1.5">
        {!showLayerLegend && (
          <button
            type="button"
            onClick={() => setShowLayerLegend(true)}
            className="border border-gray-300 bg-white px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Couches
          </button>
        )}
        <button
          type="button"
          onClick={() => setShow3d(v => !v)}
          aria-pressed={show3d}
          title="Relief 3D"
          className={`border px-3 py-1.5 text-[10px] uppercase tracking-wider shadow-sm transition-colors ${show3d ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          3D
        </button>
      </div>
      {showLayerLegend && (
        <div className="absolute bottom-4 left-4 max-h-[calc(100%-100px)] w-[260px] overflow-auto border border-gray-300 bg-white text-xs text-gray-700 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
            <span className="font-medium text-gray-900">Couches · {activeTheme.shortLabel ?? activeTheme.label}</span>
            <button
              type="button"
              onClick={() => setShowLayerLegend(false)}
              className="text-[10px] text-gray-400 hover:text-gray-700"
            >
              Fermer
            </button>
          </div>

          <div className="px-3 py-2.5">
            <div className="mb-2.5 grid grid-cols-2 gap-1">
              <LayerToggle active={showRailLines} label="Train / tram" swatch="#eb0000" onClick={() => setShowRailLines(value => !value)} />
              <LayerToggle active={showStations} label="Arrêts" swatch="#2563eb" onClick={() => setShowStations(value => !value)} />
            </div>

            <div className="mb-2.5">
              <div className="mb-1.5 text-[10px] uppercase tracking-wider text-gray-400">Anneaux de marche</div>
              <div className="grid grid-cols-2 gap-1">
                {accessibilityRings.map(ring => (
                  <button
                    key={ring.id}
                    type="button"
                    onClick={() => setVisibleRings(prev => ({ ...prev, [ring.id]: prev[ring.id] === false }))}
                    aria-pressed={visibleRings[ring.id] !== false}
                    className={`flex items-center gap-1.5 border border-gray-200 px-2 py-1 text-left transition-opacity ${visibleRings[ring.id] !== false ? 'opacity-100' : 'opacity-35'}`}
                  >
                    <span className="h-2.5 w-4 shrink-0 border" style={{ backgroundColor: ring.fill, borderColor: ring.line }} />
                    <span className="min-w-0 truncate">{ring.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-2.5">
              <div className="mb-1.5 text-[10px] uppercase tracking-wider text-gray-400">Accidents</div>
              <div className="mb-1.5 grid grid-cols-2 gap-1">
                <LayerToggle active={showAccidentDensity} label="Densité" swatch="#dc2626" onClick={() => setShowAccidentDensity(value => !value)} gradient />
                <LayerToggle active={showAccidentPoints} label="Points" swatch="#7f1d1d" onClick={() => setShowAccidentPoints(value => !value)} />
              </div>
              <div className="grid grid-cols-3 border border-gray-200 text-[10px]">
                {(['all', 'pedestrian', 'bike'] as const).map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAccidentUserFilter(value)}
                    className={`py-1 ${accidentUserFilter === value ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    {value === 'all' ? 'Tous' : value === 'pedestrian' ? 'Piétons' : 'Vélos'}
                  </button>
                ))}
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAccidentSeverityFilter(value => value === 'all' ? 'severe' : 'all')}
                  className={`flex-1 border py-1 text-[10px] ${accidentSeverityFilter === 'severe' ? 'border-red-700 bg-red-700 text-white' : 'border-gray-200 bg-white text-gray-600'}`}
                >
                  Graves/mortels
                </button>
                <label className="flex items-center gap-1 text-[10px] text-gray-500">
                  Depuis
                  <input
                    type="number"
                    min={2010}
                    max={2024}
                    value={minAccidentYear}
                    onChange={(event) => setMinAccidentYear(Number(event.target.value))}
                    className="w-14 border border-gray-200 px-1 py-0.5 text-center"
                  />
                </label>
              </div>
            </div>

            <div className="mb-2.5">
              <div className="mb-1.5 text-[10px] uppercase tracking-wider text-gray-400">Équipements accessibles</div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                {sitgEquipmentLayers.map(({ id, label, color }) => {
                  const isVisible = visibleEquipment[id] !== false;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setVisibleEquipment(prev => ({ ...prev, [id]: prev[id] === false }))}
                      aria-pressed={isVisible}
                      className={`flex min-w-0 items-center gap-1.5 text-left transition-opacity ${isVisible ? 'opacity-100' : 'opacity-35'}`}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <span className="truncate text-[10px]">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {sitgThematicLayers.filter(layer => activeTheme.thematicLayerIds.includes(layer.id)).length > 0 && (
              <div>
                <div className="mb-1.5 text-[10px] uppercase tracking-wider text-gray-400">Couches thématiques</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {sitgThematicLayers
                    .filter(layer => activeTheme.thematicLayerIds.includes(layer.id))
                    .map(({ id, label, color }) => {
                      const isVisible = visibleThematicLayers[id] !== false;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setVisibleThematicLayers(prev => ({ ...prev, [id]: prev[id] === false }))}
                          aria-pressed={isVisible}
                          className={`flex min-w-0 items-center gap-1.5 text-left transition-opacity ${isVisible ? 'opacity-100' : 'opacity-35'}`}
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                          <span className="truncate text-[10px]">{label}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs uppercase tracking-wider text-gray-500">
          Chargement des arrêts
        </div>
      )}
    </div>
  );
}

function LayerToggle({ active, label, swatch, gradient, onClick }: { active: boolean; label: string; swatch: string; gradient?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-w-0 items-center gap-2 border border-gray-200 px-2 py-1 text-left transition-opacity ${active ? 'opacity-100' : 'opacity-35'}`}
    >
      <span
        className={`h-3 w-5 shrink-0 ${gradient ? 'bg-gradient-to-r from-[#fee2e2] via-[#f87171] to-[#7f1d1d]' : ''}`}
        style={gradient ? undefined : { backgroundColor: swatch }}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}

function filterStationPois(
  collection: { type: string; features: any[] },
  userFilter: 'all' | 'pedestrian' | 'bike',
  severityFilter: 'all' | 'severe',
  minYear: number,
) {
  return {
    ...collection,
    features: collection.features.filter((feature) => {
      if (feature.properties?.kind !== 'accident') return true;
      const year = Number(feature.properties.year ?? 0);
      if (Number.isFinite(minYear) && year > 0 && year < minYear) return false;
      if (userFilter === 'pedestrian' && Number(feature.properties.pedestrians ?? 0) <= 0) return false;
      if (userFilter === 'bike') {
        const bikeCount = Number(feature.properties.bicycles ?? 0) + Number(feature.properties.eBikes25 ?? 0) + Number(feature.properties.eBikes45 ?? 0);
        if (bikeCount <= 0) return false;
      }
      if (severityFilter === 'severe' && Number(feature.properties.killed ?? 0) <= 0 && Number(feature.properties.injured_serious ?? 0) <= 0) return false;
      return true;
    }),
  };
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
      properties.light_conditions ? `<span>${escapeHtml(properties.light_conditions)}</span>` : null,
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
    properties.detail ? `<span>${escapeHtml(properties.detail)}</span>` : null,
    properties.address ? `<span>${escapeHtml(properties.address)}</span>` : null,
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
