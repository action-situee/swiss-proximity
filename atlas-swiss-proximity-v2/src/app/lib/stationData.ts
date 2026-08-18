import type { ProximityCategory } from './proximityData';

export type TimeMode = 'day' | 'night' | '24h';

export interface Station {
  id: string;
  name: string;
  coordinates: [number, number];
  type: string;
  lines: string[];
  source?: 'TPG_ARRETS' | 'transport.opendata.ch' | 'AGGLO_GARES';
  facilities?: {
    bikeParking?: boolean;
    carParking?: boolean;
    carSharing?: boolean;
    ticketOffice?: boolean;
    serviceLevel?: string;
    status?: string;
  };
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
  geometry: any;
  properties: {
    id: string;
    kind: 'equipment' | 'accident' | 'thematic';
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
    date?: string;
    hour?: string;
    commune?: string;
    source_layer?: string;
    dataset_id?: string;
    theme_id?: StationAnalysisThemeId;
    address?: string;
    detail?: string;
    distance_m?: number;
    light_conditions?: string;
    pedestrians?: number;
    bicycles?: number;
    eBikes25?: number;
    eBikes45?: number;
    injured_light?: number;
    injured_serious?: number;
    killed?: number;
    building_area_m2?: number;
    building_height_m?: number;
    building_levels?: number;
    population?: number;
    employment?: number;
    density_pop_ha?: number;
    density_emp_ha?: number;
    zone_label?: string;
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
const sitgProximityCache = new Map<string, Promise<StationProximityData>>();
let stationManifestPromise: Promise<StationProximityManifest> | null = null;

const sitgBaseUrl = 'https://vector.sitg.ge.ch/arcgis/rest/services';
const sitgFocusBounds = [5.9, 46.05, 6.35, 46.32] as const;

export const accessibilityRings = [
  { id: '250', from: 0, to: 250, label: '0-250m', title: '250 m', description: 'Proximité immédiate', fill: '#90EE90', opacity: 0.3, line: '#32CD32' },
  { id: '500', from: 250, to: 500, label: '250-500m', title: '500 m', description: '5-7 min à pied', fill: '#FFD700', opacity: 0.2, line: '#FFA500' },
  { id: '750', from: 500, to: 750, label: '500-750m', title: '750 m', description: '8-10 min à pied', fill: '#87CEEB', opacity: 0.2, line: '#4682B4' },
  { id: '1000', from: 750, to: 1000, label: '750-1000m', title: '1000 m', description: '12-15 min à pied', fill: '#FFB6C1', opacity: 0.15, line: '#FF69B4' },
] as const;

export const sitgEquipmentLayers = [
  { id: 'PrimarySchool', label: 'Écoles primaires', color: '#2563eb', service: 'DIP_ECOLES_PRIMAIRE', nameField: 'NOM_ETABLISSEMENT', detailField: 'TYPE_ETABLISSEMENT', addressField: 'ADRESSE' },
  { id: 'College', label: 'Collèges', color: '#4f46e5', service: 'DIP_COLLEGES', nameField: 'NOM_ETABLISSEMENT', detailField: 'TYPE_ETABLISSEMENT', addressField: 'ADRESSE' },
  { id: 'CarePlace', label: 'Lieux de soins', color: '#db2777', service: 'DEAS_LIEUX_DE_SOINS', nameField: 'NOM_ETABLISSEMENT', addressField: 'ADRESSE' },
  { id: 'SportFacility', label: 'Équipements sportifs', color: '#ea580c', service: 'UNI_SPORTS_EQUIPEMENTS', nameField: 'NOM_EQUIPEMENT', detailField: 'CATEGORIE_EQUIPEMENT' },
  { id: 'MajorRetail', label: 'Commerces majeurs', color: '#0891b2', service: 'Hosted/AGGLO_INST_FORTE_FREQ', nameField: 'comm_nom', detailField: 'activite', addressField: 'adresse' },
  { id: 'PostOffice', label: 'Offices postaux', color: '#ca8a04', service: 'GEO_POSTE_PT', nameField: 'NOM', detailField: 'DESCRIPTION1' },
  { id: 'ParkRide', label: 'P+R', color: '#334155', service: 'AGGLO_P_R', nameField: 'NOM_DUSUEL', detailField: 'ETAT' },
  { id: 'Lighting', label: 'Éclairage public', color: '#facc15', service: 'OTC_SL_RESEAU_MAT', nameField: 'TYPE_DE_MAT', detailField: 'REMARQUE' },
] as const;

type SitgEquipmentLayer = typeof sitgEquipmentLayers[number];

export type StationAnalysisThemeId = 'amenities' | 'safety' | 'greenPublic' | 'activeMobility' | 'urbanism';

export const sitgThematicLayers = [
  { id: 'PublicSpaces', themeId: 'greenPublic', label: 'Espaces publics', color: '#16a34a', service: 'OBS_EQUIPEMENTS_ESPACES_PUB', where: "LEG_1 IN ('9','91')", nameField: 'NOM_USUEL', detailFields: ['TYPE', 'CATEGORIE', 'SOUS_CATEGORIE'] },
  { id: 'Benches', themeId: 'greenPublic', label: 'Bancs publics', color: '#65a30d', service: 'VDG_SEV_BANCS', nameField: 'MODELE', detailFields: ['MODELE'] },
  { id: 'Bins', themeId: 'greenPublic', label: 'Corbeilles', color: '#84cc16', service: 'VDG_CORBEILLES_DECHETS', nameField: 'MODELE', detailFields: ['GESTIONNAIRE', 'INSTALLATION'] },
  { id: 'EcologicalInfrastructure', themeId: 'greenPublic', label: 'Infrastructure écologique', color: '#15803d', service: 'AGGLO_IE_PERIMETRE', nameField: 'STATUT', detailFields: ['STATUT'], maxAllowableOffset: '0.00035' },
  { id: 'NaturalHabitats', themeId: 'greenPublic', label: 'Milieux naturels', color: '#22c55e', service: 'SIPV_MN_CARTO_10', nameField: 'CAT_MN_10', detailFields: ['CAT_MN_10', 'CODE_10'], maxAllowableOffset: '0.00008' },
  { id: 'BikeFacilities', themeId: 'activeMobility', label: 'Aménagements cyclables', color: '#f59e0b', service: 'OTC_AMENAG_2ROUES', nameField: 'NOM_VOIE', detailFields: ['TYPE_AMENAGEMENT', 'REALISATION', 'CIRCUL2R'] },
  { id: 'PedestrianNetworks', themeId: 'activeMobility', label: 'Réseaux piétons', color: '#0ea5e9', service: 'SPD_RESEAUX_PIETONS', nameField: 'NATURE', detailFields: ['STATUT', 'COMMUNE'] },
  { id: 'Cyclevasions', themeId: 'activeMobility', label: 'Itinéraires cyclovasions', color: '#d97706', service: 'OTC_CYCLEVASIONS', nameField: 'NOM', detailFields: ['TYPE', 'STATUT'] },
  { id: 'HikingTrails', themeId: 'activeMobility', label: 'Randonnée pédestre', color: '#0284c7', service: 'FFP_ITINERAIRES_RANDO_PEDESTRE', nameField: 'NOM_ITINERAIRE', detailFields: ['TYPE_ITINERAIRE', 'MOBILITE_REDUITE'] },
  { id: 'TrafficCalming', themeId: 'activeMobility', label: 'Zones 20-30 km/h', color: '#a855f7', service: 'OTC_ZONE_MODERATION_TRAFIC', nameField: 'NOM_ZONE', detailFields: ['TYPE_ZONE', 'LIMITE_VITESSE'] },
  { id: 'Buildings', themeId: 'urbanism', label: 'Bâtiments hors-sol', color: '#a16207', service: 'CAD_BATIMENT_HORSOL', nameField: 'NOMBAT', detailFields: ['DESTINATION', 'HAUTEUR', 'NIVEAUX_HORSOL'], maxAllowableOffset: '0.00003' },
  { id: 'PlanGuideProjects', themeId: 'urbanism', label: 'Plans guides - projets', color: '#db2777', service: 'SIT_PG_PERIMETRE_PROJET_S_PUB', nameField: 'NOM', detailFields: ['NOM'] },
  { id: 'PlanGuideUrbanization', themeId: 'urbanism', label: 'Plans guides - urbanisation', color: '#be185d', service: 'SIT_PG_URBA_PERIMETRE_S_PUB', nameField: 'NOM', detailFields: ['NOM'] },
  { id: 'LandUseZones', themeId: 'urbanism', label: "Zones d'affectation", color: '#7c3aed', service: 'Hosted/AGGLO_ZONE_AFF_SIMPLIFIEE', nameField: 'libfvg', detailFields: ['libfvg', 'codeurb', 'commune'], maxAllowableOffset: '0.00008' },
  { id: 'PopulationJobs', themeId: 'urbanism', label: 'Population / emplois', color: '#0891b2', service: 'AGGLO_CARREAU_200', nameField: 'GRID_ID', detailFields: ['DENSITE_POP_HA', 'DENSITE_EMP_HA', 'POP_TOT_GG_2019', 'EMP_TOT_GG_19_20'] },
] as const;

type SitgThematicLayer = typeof sitgThematicLayers[number];

export const stationAnalysisThemes = [
  {
    id: 'amenities',
    label: 'Aménités',
    shortLabel: 'Aménités',
    objective: 'Lire l’offre d’équipements accessibles autour de l’arrêt.',
    equipmentLayerIds: sitgEquipmentLayers.map(layer => layer.id),
    thematicLayerIds: [],
    showAccidentDensity: false,
    showAccidentPoints: false,
  },
  {
    id: 'safety',
    label: 'Sécurité vélos/piétons',
    shortLabel: 'Sécurité',
    objective: 'Repérer les secteurs exposés pour les usagers vulnérables.',
    equipmentLayerIds: ['Lighting'],
    thematicLayerIds: ['BikeFacilities', 'PedestrianNetworks', 'TrafficCalming'],
    showAccidentDensity: true,
    showAccidentPoints: true,
  },
  {
    id: 'greenPublic',
    label: 'Espaces verts & publics',
    shortLabel: 'Espaces verts',
    objective: 'Évaluer la qualité de vie, le paysage et l’équipement des espaces ouverts.',
    equipmentLayerIds: ['SportFacility'],
    thematicLayerIds: ['PublicSpaces', 'Benches', 'Bins', 'NaturalHabitats'],
    showAccidentDensity: false,
    showAccidentPoints: false,
  },
  {
    id: 'activeMobility',
    label: 'Mobilité douce',
    shortLabel: 'Mobilité douce',
    objective: 'Analyser la marchabilité, la cyclabilité et les ruptures d’itinéraires.',
    equipmentLayerIds: ['ParkRide', 'Lighting'],
    thematicLayerIds: ['BikeFacilities', 'PedestrianNetworks', 'Cyclevasions', 'HikingTrails', 'TrafficCalming'],
    showAccidentDensity: true,
    showAccidentPoints: false,
  },
  {
    id: 'urbanism',
    label: 'Urbanisme & courtes distances',
    shortLabel: 'Urbanisme',
    objective: 'Analyser la densité bâtie, la mixité habitat/emplois et les projets urbains autour des gares.',
    equipmentLayerIds: ['ParkRide'],
    thematicLayerIds: ['Buildings', 'PlanGuideProjects', 'PlanGuideUrbanization', 'LandUseZones', 'PopulationJobs'],
    showAccidentDensity: false,
    showAccidentPoints: false,
  },
] as const;

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
  const [trainData, tramData] = await Promise.all([
    querySitgGeoJson(`${sitgBaseUrl}/GMO_FERROVIAIRE/FeatureServer/0`, {
      where: "TYPE_VOIE='train'",
      outFields: 'TYPE_VOIE,NIVEAU_RESEAU,COMMENTAIRE',
      resultRecordCount: '2000',
    }),
    querySitgGeoJson(`${sitgBaseUrl}/GMO_FERROVIAIRE/FeatureServer/0`, {
      where: "TYPE_VOIE='tram'",
      outFields: 'TYPE_VOIE,NIVEAU_RESEAU,COMMENTAIRE',
      resultRecordCount: '2000',
    }),
  ]);
  const features = [...(trainData.features ?? []), ...(tramData.features ?? [])]
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
  let lemanStations: Station[] = lemanExpressStations;
  let tramStations: Station[] = [];

  try {
    lemanStations = await fetchSitgLemanExpressStations();
  } catch (error) {
    console.error('Impossible de charger les gares AGGLO_GARES', error);
  }

  try {
    tramStations = await fetchTramStations();
  } catch (error) {
    console.error('Impossible de charger les arrêts TPG_ARRETS', error);
  }

  if (tramStations.length === 0) {
    try {
      const manifest = await fetchStationProximityManifest();
      const fallbackStations = Object.values(manifest.stations)
        .filter(isDisplayedStation)
        .map(manifestStationToStation)
        .sort(compareStations);

      if (lemanStations === lemanExpressStations) return fallbackStations;
      tramStations = fallbackStations.filter(station => station.type === 'Tram TPG');
    } catch (error) {
      console.error('Impossible de charger le manifeste local des arrêts', error);
    }
  }

  return [...lemanStations, ...tramStations].sort(compareStations);
}

export async function fetchStationProximityManifest(): Promise<StationProximityManifest> {
  stationManifestPromise ??= fetch(stationProximityManifestUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Station proximity manifest ${response.status}`);
    return response.json() as Promise<StationProximityManifest>;
  });

  return stationManifestPromise;
}

export async function fetchStationProximityData(stationId: string, themeId: StationAnalysisThemeId = 'amenities'): Promise<StationProximityData> {
  return fetchStationProximityDataForStation(stationId, themeId);
}

export async function fetchStationProximityDataForStation(stationOrId: Station | string, themeId: StationAnalysisThemeId = 'amenities'): Promise<StationProximityData> {
  if (typeof stationOrId !== 'string' && (stationOrId.source === 'AGGLO_GARES' || stationOrId.source === 'TPG_ARRETS')) {
    return fetchSitgStationProximityData(stationOrId, themeId);
  }

  const stationId = typeof stationOrId === 'string' ? stationOrId : stationOrId.id;
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

async function fetchSitgLemanExpressStations(): Promise<Station[]> {
  const geojson = await querySitgGeoJson(`${sitgBaseUrl}/AGGLO_GARES/FeatureServer/0`, {
    where: "RESEAU='LEX' AND ETAT='en service'",
    outFields: '*',
    resultRecordCount: '4000',
  });

  return (geojson.features ?? [])
    .filter((feature: any) => isPointInFocusBounds(feature.geometry?.coordinates))
    .map((feature: any) => {
      const properties = feature.properties ?? {};
      const name = String(properties.NOMS ?? 'Gare Léman Express');

      return {
        id: `sitg-agglo-gares-${properties.OBJECTID ?? slugify(name)}`,
        name,
        coordinates: feature.geometry.coordinates as [number, number],
        type: 'Léman Express',
        lines: inferLemanLines(name),
        source: 'AGGLO_GARES' as const,
        facilities: {
          bikeParking: isYes(properties.STATIONNT_VELO),
          carParking: isYes(properties.STATIONNT_AUTO),
          carSharing: isYes(properties.AUTOPARTAGE),
          ticketOffice: isYes(properties.GUICHET),
          serviceLevel: properties.DESSERTE,
          status: properties.ETAT,
        },
      };
    })
    .sort((a: Station, b: Station) => a.name.localeCompare(b.name, 'fr'));
}

async function fetchSitgStationProximityData(station: Station, themeId: StationAnalysisThemeId): Promise<StationProximityData> {
  const cacheKey = `${station.id}:${themeId}`;
  if (!sitgProximityCache.has(cacheKey)) {
    sitgProximityCache.set(cacheKey, buildSitgStationProximityData(station, themeId));
  }

  return sitgProximityCache.get(cacheKey)!;
}

async function buildSitgStationProximityData(station: Station, themeId: StationAnalysisThemeId): Promise<StationProximityData> {
  const theme = stationAnalysisThemes.find(item => item.id === themeId) ?? stationAnalysisThemes[0];
  const activeThematicLayerIds = new Set(theme.thematicLayerIds);
  const activeThematicLayers = sitgThematicLayers.filter(layer => activeThematicLayerIds.has(layer.id));
  const [equipmentResults, thematicResults, accidentCollection] = await Promise.all([
    Promise.allSettled(
      sitgEquipmentLayers.map(layer => withTimeout(
        fetchSitgEquipmentLayer(layer, station),
        8000,
        null,
        layer.service,
      )),
    ),
    Promise.allSettled(
      activeThematicLayers.map(layer => withTimeout(
        fetchSitgThematicLayer(layer, station),
        8000,
        null,
        layer.service,
      )),
    ),
    withTimeout(
      fetchVulnerableAccidents(station),
      6000,
      { type: 'FeatureCollection', features: [] },
      'OTC_ACCIDENTS',
    ),
  ]);
  const equipmentCollections = equipmentResults.flatMap((result) => {
    if (result.status === 'fulfilled') return result.value ? [result.value] : [];
    console.error('Couche SITG indisponible', result.reason);
    return [];
  });
  const thematicCollections = thematicResults.flatMap((result) => {
    if (result.status === 'fulfilled') return result.value ? [result.value] : [];
    console.error('Couche thématique SITG indisponible', result.reason);
    return [];
  });

  const features: StationProximityFeature[] = [];

  equipmentCollections.forEach(({ layer, collection }) => {
    for (const feature of collection.features ?? []) {
      const point = feature.geometry?.coordinates;
      if (!isPoint(point)) continue;
      const distance = distanceMeters(station.coordinates, point);
      const ring = ringForDistance(distance);
      if (!ring) continue;
      const properties = feature.properties ?? {};

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: point },
        properties: {
          id: `${layer.id}-${properties.OBJECTID ?? features.length}`,
          kind: 'equipment',
          category_id: layer.id,
          category: layer.label,
          name: String(properties[layer.nameField] ?? layer.label),
          detail: layer.detailField ? valueToString(properties[layer.detailField]) : undefined,
          address: layer.addressField ? valueToString(properties[layer.addressField]) : undefined,
          ring_label: ring.label,
          ring_from_m: ring.from,
          ring_to_m: ring.to,
          color: layer.color,
          distance_m: Math.round(distance),
          source_layer: layer.service,
          dataset_id: layer.id,
        },
      });
    }
  });

  thematicCollections.forEach(({ layer, collection }) => {
    for (const feature of collection.features ?? []) {
      if (!feature.geometry) continue;
      const center = geometryCenter(feature.geometry);
      const distance = center ? distanceMeters(station.coordinates, center) : undefined;
      const ring = typeof distance === 'number' ? ringForDistance(distance) : undefined;
      const properties = feature.properties ?? {};
      const detail = layer.detailFields
        .map(field => valueToString(properties[field]))
        .filter(Boolean)
        .join(' · ') || undefined;

      features.push({
        type: 'Feature',
        geometry: feature.geometry,
        properties: {
          id: `${layer.id}-${properties.OBJECTID ?? properties.objectid ?? features.length}`,
          kind: 'thematic',
          category_id: layer.id,
          category: layer.label,
          name: valueToString(properties[layer.nameField]) ?? layer.label,
          detail,
          ring_label: ring?.label ?? 'intersecte 1000m',
          ring_from_m: ring?.from,
          ring_to_m: ring?.to,
          color: layer.color,
          distance_m: typeof distance === 'number' ? Math.round(distance) : undefined,
          source_layer: layer.service,
          dataset_id: layer.id,
          theme_id: layer.themeId,
          building_area_m2: numberValue(properties.SURFACE ?? properties.Shape__Area ?? properties.SHAPE__Area),
          building_height_m: numberValue(properties.HAUTEUR),
          building_levels: numberValue(properties.NIVEAUX_HORSOL),
          population: numberValue(properties.POP_TOT_GG_2019 ?? properties.POP_TOT_GG_2015),
          employment: numberValue(properties.EMP_TOT_GG_19_20 ?? properties.EMP_TOT_GG_15_20),
          density_pop_ha: numberValue(properties.DENSITE_POP_HA),
          density_emp_ha: numberValue(properties.DENSITE_EMP_HA),
          zone_label: valueToString(properties.libfvg ?? properties.LIBFVG ?? properties.codeurb ?? properties.CODEURB),
        },
      });
    }
  });

  for (const feature of accidentCollection.features ?? []) {
    const point = feature.geometry?.coordinates;
    if (!isPoint(point)) continue;
    const distance = distanceMeters(station.coordinates, point);
    const ring = ringForDistance(distance);
    if (!ring) continue;
    const properties = feature.properties ?? {};
    const killed = Number(properties.nb_tues ?? 0);
    const injuredSerious = Number(properties.nb_blesses_graves ?? 0);

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: point },
      properties: {
        id: `accident-${properties.id_accident ?? features.length}`,
        kind: 'accident',
        category_id: 'Accident',
        name: valueToString(properties.type) ?? 'Accident usager vulnérable',
        type: valueToString(properties.type),
        cause: valueToString(properties.cause),
        consequences: valueToString(properties.consequences),
        commune: valueToString(properties.commune),
        date: sitgDateToIso(properties.date_),
        year: Number(properties.annee ?? 0) || undefined,
        hour: valueToString(properties.heure),
        light_conditions: valueToString(properties.conditions_lumineuses),
        pedestrians: Number(properties.nb_pietons ?? 0),
        bicycles: Number(properties.nb_bicyclettes ?? 0),
        eBikes25: Number(properties.nb_vae_25 ?? 0),
        eBikes45: Number(properties.nb_vae_45 ?? 0),
        injured_light: Number(properties.nb_blesses_legers ?? 0),
        injured_serious: injuredSerious,
        killed,
        ring_label: ring.label,
        ring_from_m: ring.from,
        ring_to_m: ring.to,
        color: killed > 0 ? '#7f1d1d' : injuredSerious > 0 ? '#dc2626' : '#f97316',
        distance_m: Math.round(distance),
        source_layer: 'OTC_ACCIDENTS',
        dataset_id: 'Accident',
      },
    });
  }

  return {
    type: 'FeatureCollection',
    metadata: {
      station: {
        ...station,
        network: 'Léman Express',
        data_url: '',
        equipment_count: features.filter(feature => feature.properties.kind === 'equipment').length,
        accident_count: features.filter(feature => feature.properties.kind === 'accident').length,
      },
      equipment_counts: countFeatures(features, 'equipment'),
      accident_counts: countFeatures(features, 'accident'),
    },
    features,
  };
}

const sitgLayerCache = new Map<string, Promise<{ layer: SitgEquipmentLayer; collection: any }>>();
const sitgThematicLayerCache = new Map<string, Promise<{ layer: SitgThematicLayer; collection: any }>>();
const sitgAccidentsCache = new Map<string, Promise<any>>();

function fetchSitgEquipmentLayer(layer: SitgEquipmentLayer, station: Station) {
  const cacheKey = `${layer.id}:${station.id}`;
  if (!sitgLayerCache.has(cacheKey)) {
    sitgLayerCache.set(cacheKey, querySitgGeoJson(`${sitgBaseUrl}/${layer.service}/FeatureServer/0`, {
      where: '1=1',
      outFields: '*',
      resultRecordCount: '2000',
      ...(layer.maxAllowableOffset ? { maxAllowableOffset: layer.maxAllowableOffset } : {}),
      ...spatialQueryParams(station.coordinates, 1100),
    }).then(collection => ({ layer, collection })));
  }

  return sitgLayerCache.get(cacheKey)!;
}

function fetchSitgThematicLayer(layer: SitgThematicLayer, station: Station) {
  const cacheKey = `${layer.id}:${station.id}`;
  if (!sitgThematicLayerCache.has(cacheKey)) {
    sitgThematicLayerCache.set(cacheKey, querySitgGeoJson(`${sitgBaseUrl}/${layer.service}/FeatureServer/0`, {
      where: layer.where ?? '1=1',
      outFields: '*',
      resultRecordCount: '2000',
      ...spatialQueryParams(station.coordinates, 1100),
    }).then(collection => ({ layer, collection })));
  }

  return sitgThematicLayerCache.get(cacheKey)!;
}

function fetchVulnerableAccidents(station: Station) {
  if (!sitgAccidentsCache.has(station.id)) {
    sitgAccidentsCache.set(station.id, querySitgGeoJson(`${sitgBaseUrl}/Hosted/OTC_ACCIDENTS/FeatureServer/0`, {
      where: '(nb_bicyclettes > 0 OR nb_vae_25 > 0 OR nb_vae_45 > 0 OR nb_pietons > 0)',
      outFields: 'id_accident,consequences,nb_tues,nb_blesses_graves,nb_blesses_legers,nb_bicyclettes,nb_vae_25,nb_vae_45,nb_pietons,conditions_lumineuses,commune,annee,date_,heure,cause,type',
      orderByFields: 'id_accident',
      resultRecordCount: '2000',
      ...spatialQueryParams(station.coordinates, 1100),
    }));
  }

  return sitgAccidentsCache.get(station.id)!;
}

function spatialQueryParams(center: [number, number], radiusMeters: number): Record<string, string> {
  const latitude = center[1];
  const latDelta = radiusMeters / 110540;
  const lonDelta = radiusMeters / (111320 * Math.max(0.2, Math.cos(latitude * Math.PI / 180)));

  return {
    geometry: `${center[0] - lonDelta},${center[1] - latDelta},${center[0] + lonDelta},${center[1] + latDelta}`,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
  };
}

async function querySitgGeoJson(baseLayerUrl: string, params: Record<string, string>) {
  const first = await querySitgGeoJsonPage(baseLayerUrl, params, 0);
  const features = [...(first.features ?? [])];

  let offset = features.length;
  let page = first;
  while (hasExceededTransferLimit(page)) {
    page = await querySitgGeoJsonPage(baseLayerUrl, params, offset);
    const pageFeatures = page.features ?? [];
    if (pageFeatures.length === 0) break;
    features.push(...pageFeatures);
    offset += pageFeatures.length;
  }

  return { type: 'FeatureCollection', features };
}

async function querySitgGeoJsonPage(baseLayerUrl: string, params: Record<string, string>, offset: number) {
  const searchParams = new URLSearchParams({
    outSR: '4326',
    f: 'geojson',
    returnGeometry: 'true',
    ...params,
    resultOffset: String(offset),
  });
  const response = await fetch(`${baseLayerUrl}/query?${searchParams.toString()}`);
  if (!response.ok) throw new Error(`${baseLayerUrl}: ${response.status}`);
  const data = await readJsonResponse(response, baseLayerUrl);
  if (data.error) throw new Error(data.error.message ?? `${baseLayerUrl}: erreur SITG`);
  return data;
}

async function readJsonResponse(response: Response, context: string) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${context}: réponse SITG non JSON (${text.slice(0, 80)})`);
  }
}

function hasExceededTransferLimit(page: any) {
  return Boolean(page?.properties?.exceededTransferLimit ?? page?.exceededTransferLimit);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T, label: string): Promise<T> {
  return new Promise((resolve) => {
    const timeout = globalThis.setTimeout(() => {
      console.warn(`${label}: délai dépassé, affichage sans cette couche`);
      resolve(fallback);
    }, timeoutMs);

    promise
      .then((value) => {
        globalThis.clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        globalThis.clearTimeout(timeout);
        console.error(`${label}: couche indisponible`, error);
        resolve(fallback);
      });
  });
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

function compareStations(a: Station, b: Station) {
  const networkRank = (station: Station) => station.type === 'Léman Express' ? 0 : 1;
  return networkRank(a) - networkRank(b) || a.name.localeCompare(b.name, 'fr');
}

async function fetchTramStations(): Promise<Station[]> {
  const data = await querySitgJson(`${sitgBaseUrl}/Hosted/TPG_ARRETS/FeatureServer/0`, {
    where: `ligne in (${tramLines.map(line => `'${line}'`).join(',')})`,
    outFields: 'nom_arret,ligne,direction,objectid',
    outSR: '4326',
    resultRecordCount: '1000',
  });
  const grouped = new Map<string, { name: string; lines: Set<string>; points: [number, number][] }>();

  for (const feature of data.features ?? []) {
    const name = feature.attributes?.nom_arret;
    const line = feature.attributes?.ligne;
    const point = feature.geometry?.points?.[0] ?? featurePointCoordinates(feature.geometry);
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

async function querySitgJson(baseLayerUrl: string, params: Record<string, string>) {
  const first = await querySitgJsonPage(baseLayerUrl, params, 0);
  const features = [...(first.features ?? [])];

  let offset = features.length;
  let page = first;
  while (hasExceededTransferLimit(page)) {
    page = await querySitgJsonPage(baseLayerUrl, params, offset);
    const pageFeatures = page.features ?? [];
    if (pageFeatures.length === 0) break;
    features.push(...pageFeatures);
    offset += pageFeatures.length;
  }

  return { ...first, features };
}

async function querySitgJsonPage(baseLayerUrl: string, params: Record<string, string>, offset: number) {
  const searchParams = new URLSearchParams({
    f: 'json',
    returnGeometry: 'true',
    ...params,
    resultOffset: String(offset),
  });
  const response = await fetch(`${baseLayerUrl}/query?${searchParams.toString()}`);
  if (!response.ok) throw new Error(`${baseLayerUrl}: ${response.status}`);
  const data = await readJsonResponse(response, baseLayerUrl);
  if (data.error) throw new Error(data.error.message ?? `${baseLayerUrl}: erreur SITG`);
  return data;
}

function featurePointCoordinates(geometry: any): [number, number] | null {
  if (typeof geometry?.x === 'number' && typeof geometry?.y === 'number') {
    return [geometry.x, geometry.y];
  }

  return null;
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
  const centrality = station.name.includes('Cornavin') || station.name === 'Genève' ? 34 : station.id === 'plainpalais' || station.id === 'rive' ? 24 : 16;
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
      if (feature.properties.kind === 'thematic') return true;
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

export function stationLayerMetrics(proximityData: StationProximityData | null) {
  if (!proximityData) return [];

  const labels = new Map(sitgEquipmentLayers.map(layer => [layer.id, layer.label]));
  const colors = new Map(sitgEquipmentLayers.map(layer => [layer.id, layer.color]));
  const counts = new Map<string, number>();

  proximityData.features.forEach((feature) => {
    if (feature.properties.kind !== 'equipment') return;
    const id = feature.properties.category_id ?? 'Other';
    counts.set(id, (counts.get(id) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([id, count]) => ({
      id,
      category: labels.get(id) ?? id,
      count,
      color: colors.get(id) ?? '#6b7280',
    }))
    .sort((a, b) => b.count - a.count);
}

export function stationRingMetrics(proximityData: StationProximityData | null) {
  return accessibilityRings.map((ring) => {
    const features = proximityData?.features.filter(feature => feature.properties.ring_label === ring.label) ?? [];
    return {
      id: ring.id,
      ring: ring.title,
      label: ring.label,
      services: features.filter(feature => feature.properties.kind === 'equipment').length,
      accidents: features.filter(feature => feature.properties.kind === 'accident').length,
      severe: features.filter(feature => feature.properties.kind === 'accident' && isSevereAccident(feature)).length,
    };
  });
}

export function stationAccidentMetrics(proximityData: StationProximityData | null) {
  const accidents = proximityData?.features.filter(feature => feature.properties.kind === 'accident') ?? [];
  const killed = accidents.reduce((sum, feature) => sum + Number(feature.properties.killed ?? 0), 0);
  const serious = accidents.reduce((sum, feature) => sum + Number(feature.properties.injured_serious ?? 0), 0);
  const light = accidents.reduce((sum, feature) => sum + Number(feature.properties.injured_light ?? 0), 0);
  const pedestrians = accidents.filter(feature => Number(feature.properties.pedestrians ?? 0) > 0).length;
  const bikes = accidents.filter(feature => (
    Number(feature.properties.bicycles ?? 0) + Number(feature.properties.eBikes25 ?? 0) + Number(feature.properties.eBikes45 ?? 0)
  ) > 0).length;
  const night = accidents.filter(feature => String(feature.properties.light_conditions ?? '').toLowerCase().includes('nuit')).length;
  const seriousOrFatal = accidents.filter(isSevereAccident).length;
  const bySeverity = [
    { label: 'Tués', count: killed, color: '#7f1d1d' },
    { label: 'Blessés graves', count: serious, color: '#dc2626' },
    { label: 'Blessés légers', count: light, color: '#f97316' },
    { label: 'Dommages matériels', count: accidents.filter(feature => String(feature.properties.consequences ?? '').includes('dommages')).length, color: '#9ca3af' },
  ];
  const byCommune = Array.from(accidents.reduce((map, feature) => {
    const commune = feature.properties.commune ?? 'Inconnue';
    map.set(commune, (map.get(commune) ?? 0) + 1);
    return map;
  }, new Map<string, number>()).entries())
    .map(([commune, count]) => ({ commune, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total: accidents.length,
    seriousOrFatal,
    pedestrians,
    bikes,
    night,
    bySeverity,
    byCommune,
  };
}

export function stationThemeMetrics(proximityData: StationProximityData | null, themeId: StationAnalysisThemeId) {
  const theme = stationAnalysisThemes.find(item => item.id === themeId) ?? stationAnalysisThemes[0];
  const thematicLayers = new Map(sitgThematicLayers.map(layer => [layer.id, layer]));
  const equipmentLayers = new Map(sitgEquipmentLayers.map(layer => [layer.id, layer]));
  const activeLayerIds = new Set([...theme.thematicLayerIds, ...theme.equipmentLayerIds]);
  const features = proximityData?.features.filter(feature => activeLayerIds.has(feature.properties.category_id ?? '')) ?? [];
  const thematicFeatures = features.filter(feature => feature.properties.kind === 'thematic');
  const equipmentFeatures = features.filter(feature => feature.properties.kind === 'equipment');
  const accidentFeatures = proximityData?.features.filter(feature => feature.properties.kind === 'accident') ?? [];
  const byLayer = Array.from(activeLayerIds).map((id) => {
    const layer = thematicLayers.get(id) ?? equipmentLayers.get(id);
    const layerFeatures = features.filter(feature => feature.properties.category_id === id);
    const pointCount = layerFeatures.filter(feature => feature.geometry?.type === 'Point' || feature.geometry?.type === 'MultiPoint').length;
    const lineCount = layerFeatures.filter(feature => feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString').length;
    const polygonCount = layerFeatures.filter(feature => feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon').length;

    return {
      id,
      label: layer?.label ?? id,
      count: layerFeatures.length,
      points: pointCount,
      lines: lineCount,
      polygons: polygonCount,
      color: layer?.color ?? '#6b7280',
    };
  }).filter(item => item.count > 0);
  const buildings = proximityData?.features.filter(feature => feature.properties.category_id === 'Buildings') ?? [];
  const projects = proximityData?.features.filter(feature => feature.properties.category_id === 'PlanGuideProjects' || feature.properties.category_id === 'PlanGuideUrbanization') ?? [];
  const populationJobs = proximityData?.features.filter(feature => feature.properties.category_id === 'PopulationJobs') ?? [];
  const totalPopulation = populationJobs.reduce((sum, feature) => sum + Number(feature.properties.population ?? 0), 0);
  const totalEmployment = populationJobs.reduce((sum, feature) => sum + Number(feature.properties.employment ?? 0), 0);
  const builtAreaM2 = buildings.reduce((sum, feature) => sum + Number(feature.properties.building_area_m2 ?? 0), 0);
  const averageHeight = average(
    buildings
      .map(feature => Number(feature.properties.building_height_m ?? 0))
      .filter(value => value > 0),
  );
  const averagePopDensity = average(
    populationJobs
      .map(feature => Number(feature.properties.density_pop_ha ?? 0))
      .filter(value => value > 0),
  );
  const averageEmpDensity = average(
    populationJobs
      .map(feature => Number(feature.properties.density_emp_ha ?? 0))
      .filter(value => value > 0),
  );

  return {
    theme,
    byLayer,
    total: features.length,
    points: thematicFeatures.concat(equipmentFeatures).filter(feature => feature.geometry?.type === 'Point' || feature.geometry?.type === 'MultiPoint').length,
    lines: thematicFeatures.filter(feature => feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString').length,
    polygons: thematicFeatures.filter(feature => feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon').length,
    accidents: accidentFeatures.length,
    severeAccidents: accidentFeatures.filter(isSevereAccident).length,
    urbanism: {
      buildings: buildings.length,
      builtAreaM2,
      builtDensityM2Ha: Math.round(builtAreaM2 / 100),
      averageHeight: Math.round(averageHeight * 10) / 10,
      projects: projects.length,
      population: Math.round(totalPopulation),
      employment: Math.round(totalEmployment),
      jobsPerResident: totalPopulation > 0 ? Math.round((totalEmployment / totalPopulation) * 100) / 100 : undefined,
      averagePopDensity: Math.round(averagePopDensity),
      averageEmpDensity: Math.round(averageEmpDensity),
    },
  };
}

function isSevereAccident(feature: StationProximityFeature) {
  return Number(feature.properties.killed ?? 0) > 0 || Number(feature.properties.injured_serious ?? 0) > 0;
}

export function stationEquipmentPercentile(
  stationId: string,
  equipmentCountFallback: number,
  manifestEntries: StationManifestEntry[],
): number {
  if (manifestEntries.length < 10) return -1;
  const manifestEntry = manifestEntries.find(e => e.id === stationId);
  const count = manifestEntry?.equipment_count ?? equipmentCountFallback;
  const below = manifestEntries.filter(e => e.equipment_count < count).length;
  return Math.round((below / manifestEntries.length) * 100);
}

export function stationGradient500m(proximityData: StationProximityData | null): number {
  if (!proximityData) return -1;
  const equipment = proximityData.features.filter(f => f.properties.kind === 'equipment');
  const total = equipment.length;
  if (total === 0) return -1;
  const in500 = equipment.filter(f => f.properties.ring_label === '0-250m' || f.properties.ring_label === '250-500m').length;
  return Math.round((in500 / total) * 100);
}

export function stationEssentialCoverage(proximityData: StationProximityData | null): { present: number; outOf: number } {
  if (!proximityData) return { present: 0, outOf: 0 };
  const presentIds = new Set(
    proximityData.features
      .filter(f => f.properties.kind === 'equipment')
      .map(f => f.properties.category_id ?? ''),
  );
  const sitgEssential = ['PrimarySchool', 'College', 'CarePlace', 'MajorRetail', 'SportFacility', 'PostOffice'];
  const manifestEssential = ['Education', 'Care', 'Shopping', 'Sport', 'Public', 'Provision'];
  const isSitg = sitgEssential.some(id => presentIds.has(id));
  const essentialSet = isSitg ? sitgEssential : manifestEssential;
  return { present: essentialSet.filter(id => presentIds.has(id)).length, outOf: essentialSet.length };
}

// Taux de référence réseau pour la gravité des accidents usagers vulnérables (issu de l'EDA)
const NETWORK_SEVERITY_RATE = 20;

export function stationSafetyRate(proximityData: StationProximityData | null): { rate: number; networkRate: number; total: number } {
  const accidents = proximityData?.features.filter(f => f.properties.kind === 'accident') ?? [];
  const severe = accidents.filter(isSevereAccident).length;
  const total = accidents.length;
  return { rate: total > 0 ? Math.round((severe / total) * 100) : 0, networkRate: NETWORK_SEVERITY_RATE, total };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function countFeatures(features: StationProximityFeature[], kind: 'equipment' | 'accident') {
  const counts: Record<string, number> = { total: 0 };

  features.forEach((feature) => {
    if (feature.properties.kind !== kind) return;
    counts.total += 1;
    const categoryId = feature.properties.category_id ?? 'Other';
    const ringLabel = feature.properties.ring_label ? `ring:${feature.properties.ring_label}` : null;
    counts[categoryId] = (counts[categoryId] ?? 0) + 1;
    if (ringLabel) counts[ringLabel] = (counts[ringLabel] ?? 0) + 1;
    if (kind === 'accident' && isSevereAccident(feature)) counts.severe_or_fatal = (counts.severe_or_fatal ?? 0) + 1;
  });

  return counts;
}

function ringForDistance(distance: number) {
  return accessibilityRings.find(ring => distance > ring.from && distance <= ring.to)
    ?? (distance === 0 ? accessibilityRings[0] : undefined);
}

function distanceMeters(from: [number, number], to: [number, number]) {
  const earthRadius = 6371000;
  const toRadians = Math.PI / 180;
  const dLat = (to[1] - from[1]) * toRadians;
  const dLon = (to[0] - from[0]) * toRadians;
  const lat1 = from[1] * toRadians;
  const lat2 = to[1] * toRadians;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function geometryCenter(geometry: any): [number, number] | null {
  const coordinates = geometryCoordinates(geometry?.coordinates);
  if (coordinates.length === 0) return null;
  const bounds = coordinates.reduce(
    (current, point) => ({
      minX: Math.min(current.minX, point[0]),
      minY: Math.min(current.minY, point[1]),
      maxX: Math.max(current.maxX, point[0]),
      maxY: Math.max(current.maxY, point[1]),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );

  return [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2];
}

function geometryCoordinates(value: unknown): [number, number][] {
  if (isPoint(value)) return [value];
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => geometryCoordinates(item));
}

function isPoint(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]);
}

function isPointInFocusBounds(value: unknown) {
  if (!isPoint(value)) return false;
  return value[0] >= sitgFocusBounds[0]
    && value[0] <= sitgFocusBounds[2]
    && value[1] >= sitgFocusBounds[1]
    && value[1] <= sitgFocusBounds[3];
}

function isYes(value: unknown) {
  return String(value ?? '').trim().toUpperCase() === 'OUI';
}

function valueToString(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  return String(value);
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function sitgDateToIso(value: unknown) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return undefined;
  return new Date(timestamp).toISOString();
}

function inferLemanLines(name: string) {
  const central = ['Genève-Cornavin', 'Genève-Eaux-Vives', 'Genève-Champel', 'Lancy-Bachet', 'Lancy-Pont-Rouge', 'Chêne-Bourg', 'Annemasse'];
  if (central.includes(name)) return ['L1', 'L2', 'L3', 'L4'];
  if (['Genève-Sécheron', 'Chambésy', 'Les Tuileries', 'Genthod-Bellevue', 'Creux-de-Genthod', 'Versoix', 'Pont-Céard', 'Mies', 'Tannay', 'Coppet'].includes(name)) return ['L1', 'L2', 'L3', 'L4'];
  if (['Vernier', 'Meyrin', 'Zimeysa', 'Satigny', 'Russin', 'La Plaine', 'Pougny-Chancy'].includes(name)) return ['L5', 'L6'];
  return ['LEX'];
}
