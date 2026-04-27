import type { ProximityCategory } from './proximityData';

export type TimeMode = 'day' | 'night' | '24h';

export interface Station {
  id: string;
  name: string;
  coordinates: [number, number];
  type: string;
  lines: string[];
  source?: 'TPG_ARRETS' | 'transport.opendata.ch';
}

export interface StationManifestEntry extends Station {
  network?: string;
  data_url: string;
  equipment_count: number;
  accident_count: number;
}

export interface StationProximityManifest {
  generated_at: string;
  format: 'station-proximity-v1';
  crs: 'EPSG:4326';
  rings_m: string[];
  stations: Record<string, StationManifestEntry>;
}

export interface StationProximityData {
  type: 'FeatureCollection';
  metadata?: {
    station?: StationManifestEntry;
    equipment_counts?: Record<string, number>;
    accident_counts?: Record<string, number>;
  };
  features: StationProximityFeature[];
}

export interface StationProximityFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    id: string;
    kind: 'equipment' | 'accident';
    name?: string;
    category_id?: string;
    category?: string;
    color?: string;
    ring_label?: string;
    ring_from_m?: number;
    ring_to_m?: number;
    opening_hours?: string;
    open_day?: boolean;
    open_night?: boolean;
    open_24h?: boolean;
    type?: string;
    cause?: string;
    consequences?: string;
    year?: number;
    injured_light?: number;
    injured_serious?: number;
    killed?: number;
  };
}

export interface ServiceMetric {
  id: string;
  category: string;
  count: number;
  diversity: number;
  weightedScore: number;
}

const tramLines = ['12', '14', '15', '17', '18'];
const stationProximityManifestUrl = '/data/stations-proximity/manifest.json';
const stationProximityCache = new Map<string, Promise<StationProximityData>>();
let stationManifestPromise: Promise<StationProximityManifest> | null = null;

export const lemanExpressStations: Station[] = [
  { id: 'leman-8501023', name: 'Coppet', coordinates: [6.187806, 46.317405], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4'], source: 'transport.opendata.ch' },
  { id: 'leman-8501015', name: 'Tannay', coordinates: [6.181097, 46.307659], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4'], source: 'transport.opendata.ch' },
  { id: 'leman-8501014', name: 'Mies', coordinates: [6.167641, 46.298503], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4'], source: 'transport.opendata.ch' },
  { id: 'leman-8501013', name: 'Pont-Céard', coordinates: [6.162762, 46.286824], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4'], source: 'transport.opendata.ch' },
  { id: 'leman-8501022', name: 'Versoix', coordinates: [6.165718, 46.279741], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4'], source: 'transport.opendata.ch' },
  { id: 'leman-8501012', name: 'Creux-de-Genthod', coordinates: [6.161292, 46.263776], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4'], source: 'transport.opendata.ch' },
  { id: 'leman-8501021', name: 'Genthod-Bellevue', coordinates: [6.153947, 46.256747], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4'], source: 'transport.opendata.ch' },
  { id: 'leman-8501011', name: 'Les Tuileries', coordinates: [6.147312, 46.24996], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4'], source: 'transport.opendata.ch' },
  { id: 'leman-8501020', name: 'Chambésy', coordinates: [6.147279, 46.240954], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4'], source: 'transport.opendata.ch' },
  { id: 'leman-8516283', name: 'Genève-Sécheron', coordinates: [6.144542, 46.222452], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4'], source: 'transport.opendata.ch' },
  { id: 'leman-8501008', name: 'Genève', coordinates: [6.142435, 46.210228], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'], source: 'transport.opendata.ch' },
  { id: 'leman-8516155', name: 'Lancy-Pont-Rouge', coordinates: [6.124929, 46.18596], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4'], source: 'transport.opendata.ch' },
  { id: 'leman-8517142', name: 'Lancy-Bachet', coordinates: [6.12934, 46.174342], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4'], source: 'transport.opendata.ch' },
  { id: 'leman-8516272', name: 'Genève-Champel', coordinates: [6.153473, 46.192208], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4'], source: 'transport.opendata.ch' },
  { id: 'leman-8516273', name: 'Genève-Eaux-Vives', coordinates: [6.166549, 46.201461], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4'], source: 'transport.opendata.ch' },
  { id: 'leman-8516274', name: 'Chêne-Bourg', coordinates: [6.197316, 46.196612], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4'], source: 'transport.opendata.ch' },
  { id: 'leman-8774549', name: 'Annemasse', coordinates: [6.236381, 46.199355], type: 'Léman Express', lines: ['L1', 'L2', 'L3', 'L4'], source: 'transport.opendata.ch' },
];

export const transportStations: Station[] = lemanExpressStations;

export const transitLinesGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: lemanExpressStations.map(station => station.coordinates),
      },
      properties: { name: 'Léman Express Coppet-Annemasse' },
    },
  ],
};

export const railGraphFallbackGeoJson = transitLinesGeoJson;

export async function fetchRegionalRailGraph(): Promise<any> {
  const params = new URLSearchParams({
    where: "STATUT='Existant' AND (COMMENTAIRE LIKE '%L1%' OR COMMENTAIRE LIKE '%L2%' OR COMMENTAIRE LIKE '%L3%' OR COMMENTAIRE LIKE '%L4%' OR TYPE_VOIE='Tramway')",
    outFields: 'TYPE_VOIE,STATUT,NOM,COMMENTAIRE',
    outSR: '4326',
    f: 'json',
    resultRecordCount: '5000',
  });
  const url = `https://vector.sitg.ge.ch/arcgis/rest/services/GMO_GRAPHE_FERROVIAIRE_REGION/FeatureServer/0/query?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GMO_GRAPHE_FERROVIAIRE_REGION ${response.status}`);
  const data = await response.json();
  const features = (data.features ?? [])
    .map((feature: any, index: number) => ({
      type: 'Feature',
      id: feature.attributes?.OBJECTID ?? index,
      geometry: esriPolylineToGeoJson(feature.geometry),
      properties: feature.attributes ?? {},
    }))
    .filter((feature: any) => feature.geometry);

  if (features.length === 0) throw new Error('GMO_GRAPHE_FERROVIAIRE_REGION: aucune géométrie exploitable');

  return {
    type: 'FeatureCollection',
    features,
  };
}

function esriPolylineToGeoJson(geometry: any) {
  if (!geometry?.paths) return null;

  return geometry.paths.length === 1
    ? { type: 'LineString', coordinates: geometry.paths[0] }
    : { type: 'MultiLineString', coordinates: geometry.paths };
}

export function getInitialStation() {
  return lemanExpressStations.find(station => station.name === 'Genève') ?? lemanExpressStations[0];
}

export async function fetchRealTransportStations(): Promise<Station[]> {
  try {
    const manifest = await fetchStationProximityManifest();
    return Object.values(manifest.stations)
      .filter(isDisplayedStation)
      .map(manifestStationToStation)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  } catch (error) {
    console.error('Impossible de charger le manifeste local des arrêts', error);
  }

  const tramStations = await fetchTramStations();
  return [...lemanExpressStations, ...tramStations].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export async function fetchStationProximityManifest(): Promise<StationProximityManifest> {
  stationManifestPromise ??= fetch(stationProximityManifestUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Station proximity manifest ${response.status}`);
    return response.json() as Promise<StationProximityManifest>;
  });

  return stationManifestPromise;
}

export async function fetchStationProximityData(stationId: string): Promise<StationProximityData> {
  if (!stationProximityCache.has(stationId)) {
    stationProximityCache.set(stationId, fetchStationProximityManifest()
      .then((manifest) => {
        const dataUrl = manifest.stations[stationId]?.data_url ?? `/data/stations-proximity/stops/${stationId}.geojson`;
        return fetch(dataUrl);
      })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Station proximity data ${stationId}: ${response.status}`);
        return response.json() as Promise<StationProximityData>;
      }));
  }

  return stationProximityCache.get(stationId)!;
}

function manifestStationToStation(station: StationManifestEntry): Station {
  return {
    id: station.id,
    name: station.name,
    coordinates: station.coordinates,
    type: station.network === 'TPG' ? 'Tram TPG' : station.type,
    lines: station.lines,
  };
}

function isDisplayedStation(station: StationManifestEntry) {
  if (station.network === 'Léman Express' || station.type === 'Léman Express') return true;
  if (station.network !== 'TPG') return false;
  return station.lines.some(line => tramLines.includes(line.replace(/^0/, '')));
}

async function fetchTramStations(): Promise<Station[]> {
  const query = encodeURIComponent(`LIGNE in (${tramLines.map(line => `'${line}'`).join(',')})`);
  const params = new URLSearchParams({
    where: decodeURIComponent(query),
    outFields: 'NOM_ARRET,LIGNE,DIRECTION,OBJECTID',
    outSR: '4326',
    f: 'json',
    resultRecordCount: '2000',
  });
  const url = `https://vector.sitg.ge.ch/arcgis/rest/services/TPG_ARRETS/FeatureServer/0/query?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`TPG_ARRETS ${response.status}`);
  const data = await response.json();
  const grouped = new Map<string, { name: string; lines: Set<string>; points: [number, number][] }>();

  for (const feature of data.features ?? []) {
    const name = feature.attributes?.NOM_ARRET;
    const line = feature.attributes?.LIGNE;
    const point = feature.geometry?.points?.[0];
    if (!name || !line || !point) continue;

    const current = grouped.get(name) ?? { name, lines: new Set<string>(), points: [] };
    current.lines.add(String(line).replace(/^0/, ''));
    current.points.push(point);
    grouped.set(name, current);
  }

  return Array.from(grouped.values()).map((item) => {
    const coordinates = averagePoint(item.points);
    const lines = Array.from(item.lines).sort((a, b) => Number(a) - Number(b));

    return {
      id: `tram-${slugify(item.name)}`,
      name: item.name,
      coordinates,
      type: 'Tram TPG',
      lines,
      source: 'TPG_ARRETS' as const,
    };
  });
}

function averagePoint(points: [number, number][]): [number, number] {
  const total = points.reduce(
    (sum, point) => [sum[0] + point[0], sum[1] + point[1]],
    [0, 0],
  );

  return [total[0] / points.length, total[1] / points.length];
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();
}

export function timeModeLabel(timeMode: TimeMode) {
  if (timeMode === 'night') return 'Nuit';
  if (timeMode === '24h') return '24h';
  return 'Jour';
}

export function timeModeFactor(timeMode: TimeMode) {
  if (timeMode === 'night') return 0.58;
  if (timeMode === '24h') return 1.18;
  return 1;
}

export function stationActivityScore(station: Station, timeMode: TimeMode) {
  const lineScore = station.lines.length * 12;
  const centrality = station.id === 'cornavin' ? 34 : station.id === 'plainpalais' || station.id === 'rive' ? 24 : 16;
  return Math.round((lineScore + centrality) * timeModeFactor(timeMode));
}

export function stationServiceMetrics(
  station: Station,
  categories: ProximityCategory[],
  timeMode: TimeMode,
  proximityData?: StationProximityData | null,
): ServiceMetric[] {
  if (proximityData) {
    return stationEquipmentMetrics(categories, timeMode, proximityData);
  }

  const active = categories.filter(category => category.enabled && category.id !== 'All');
  const fallback = categories.filter(category => ['Provision', 'Catering', 'Transport', 'Public'].includes(category.id));
  const relevantCategories = active.length > 0 ? active : fallback;
  const base = stationActivityScore(station, timeMode);

  return relevantCategories.map((category, index) => {
    const count = Math.max(1, Math.round((base * (0.42 + index * 0.08) * category.weight) / Math.max(1, category.diversity)));
    return {
      id: category.id,
      category: category.name,
      count,
      diversity: category.diversity,
      weightedScore: Math.round(count * category.weight * category.diversity),
    };
  });
}

export function stationEquipmentMetrics(
  categories: ProximityCategory[],
  timeMode: TimeMode,
  proximityData: StationProximityData,
): ServiceMetric[] {
  const selected = selectedEquipmentCategories(categories);
  const selectedIds = new Set(selected.map(category => category.id));
  const counts = new Map<string, number>();

  proximityData.features.forEach((feature) => {
    if (feature.properties.kind !== 'equipment') return;
    const categoryId = feature.properties.category_id ?? 'Other';
    if (selectedIds.size > 0 && !selectedIds.has(categoryId)) return;
    if (!isEquipmentVisibleForTimeMode(feature, timeMode)) return;
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  });

  return selected
    .map((category) => {
      const count = counts.get(category.id) ?? 0;
      return {
        id: category.id,
        category: category.name,
        count,
        diversity: category.diversity,
        weightedScore: Math.round(count * category.weight * category.diversity),
      };
    })
    .filter(item => item.count > 0 || selectedIds.size > 0);
}

export function accessibilityMetrics(station: Station, timeMode: TimeMode) {
  const factor = timeModeFactor(timeMode);
  const hubBonus = station.type === 'Gare' ? 1.25 : 1;

  return [
    { id: 'walk', mode: 'Marche', '5min': Math.round(700 * factor), '10min': Math.round(1800 * factor), '15min': Math.round(3400 * factor) },
    { id: 'bike', mode: 'Velo', '5min': Math.round(2600 * factor), '10min': Math.round(6900 * factor), '15min': Math.round(12400 * factor) },
    { id: 'transit', mode: 'TP', '5min': Math.round(1200 * factor * hubBonus), '10min': Math.round(4200 * factor * hubBonus), '15min': Math.round(9300 * factor * hubBonus) },
  ];
}

export function createCircle(center: [number, number], radiusInMeters: number) {
  const points = 72;
  const coords: [number, number][] = [];
  const distanceX = radiusInMeters / (111320 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = radiusInMeters / 110540;

  for (let i = 0; i < points; i += 1) {
    const theta = (i / points) * (2 * Math.PI);
    coords.push([
      center[0] + distanceX * Math.cos(theta),
      center[1] + distanceY * Math.sin(theta),
    ]);
  }

  coords.push(coords[0]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {},
  };
}

export function stationProximityGeoJson(
  proximityData: StationProximityData | null,
  categories: ProximityCategory[],
  timeMode: TimeMode,
) {
  if (!proximityData) return { type: 'FeatureCollection', features: [] };

  const selected = selectedEquipmentCategories(categories);
  const selectedIds = new Set(selected.map(category => category.id));

  return {
    type: 'FeatureCollection',
    features: proximityData.features.filter((feature) => {
      if (feature.properties.kind === 'accident') return true;
      if (!isEquipmentVisibleForTimeMode(feature, timeMode)) return false;
      if (selectedIds.size === 0) return true;
      return selectedIds.has(feature.properties.category_id ?? 'Other');
    }),
  };
}

function selectedEquipmentCategories(categories: ProximityCategory[]) {
  const active = categories.filter(category => category.enabled && category.id !== 'All');
  return active.length > 0 ? active : categories.filter(category => category.id !== 'All');
}

function isEquipmentVisibleForTimeMode(feature: StationProximityFeature, timeMode: TimeMode) {
  if (timeMode === '24h') return true;
  if (feature.properties.open_24h) return true;

  const value = timeMode === 'night' ? feature.properties.open_night : feature.properties.open_day;
  return value !== false;
}
