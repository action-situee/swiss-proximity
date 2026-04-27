import type { ExpressionSpecification, LngLatBoundsLike, LngLatLike } from 'maplibre-gl';

export type MapMode = 'supply' | 'demand';
export type TilingType = 'h3' | 'polygon';

export interface DemandVariable {
  id: string;
  name: string;
  enabled: boolean;
}

export interface ProximityCategory {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  weight: number;
  diversity: number;
  infos: string[];
  tags: string[];
}

export interface TileParams {
  name: string;
  url: string;
}

export interface LegendItem {
  label: string;
  color: string;
  category?: string;
  distance?: string;
}

const baseUrl = 'https://enacit4r-cdn.epfl.ch/lasur-swiss-proximity/output';

export const boundsGeneva: LngLatBoundsLike = [5.712891, 45.890008, 6.789551, 46.619261];
export const boundsSwitzerland: LngLatBoundsLike = [5.790325, 45.63959, 10.120837, 47.853792];
export const maxBoundsSwitzerland: LngLatBoundsLike = [4.5, 45.2, 11.5, 48.5];
export const centerSwitzerland: LngLatLike = [7.95, 46.74];

export const listYears = [2017, 2050];
export const listDistances = [1300, 3800, 7000];

export const listTilesParams: TileParams[] = [
  { name: 'demand_geneva_h3', url: `pmtiles://${baseUrl}/demand_geneva_h3.pmtiles` },
  { name: 'demand_geneva_polygon', url: `pmtiles://${baseUrl}/demand_geneva_polygon.pmtiles` },
  { name: 'supply_h3', url: `pmtiles://${baseUrl}/supply_h3.pmtiles` },
  { name: 'supply_polygon', url: `pmtiles://${baseUrl}/supply_polygon.pmtiles` },
];

export const demandColors: LegendItem[] = [
  { label: '0 (No fill)', color: '#FFFFFF', category: 'G' },
  { label: 'Quantile 1/6', color: '#D9F0A3', category: 'F' },
  { label: 'Quantile 2/6', color: '#ADDD8E', category: 'E' },
  { label: 'Quantile 3/6', color: '#78C679', category: 'D' },
  { label: 'Quantile 4/6', color: '#41AB5D', category: 'C' },
  { label: 'Quantile 5/6', color: '#238443', category: 'B' },
  { label: 'Quantile 6/6', color: '#005A32', category: 'A' },
];

export const supplyColors: LegendItem[] = [
  { label: "Très forte proximité", distance: '0-1200m', color: '#073B4C', category: 'A' },
  { label: 'Forte proximité', distance: '1200-1600m', color: '#118AB2', category: 'B' },
  { label: 'Bonne proximité', distance: '1600-2400m', color: '#06D6A0', category: 'C' },
  { label: 'Proximité moyenne', distance: '2400-3700m', color: '#B8DE6F', category: 'D' },
  { label: 'Proximité faible', distance: '3700-5000m', color: '#FFD166', category: 'E' },
  { label: 'Très faible proximité', distance: '5000-7000m', color: '#F78C6B', category: 'F' },
  { label: 'Hors proximité', distance: '> 7000m', color: '#D62828', category: 'G' },
];

export const proximityColorPalettes = {
  contrast: {
    name: 'Contraste',
    colors: supplyColors,
  },
  classic: {
    name: 'Classique vert',
    colors: [
      { label: "15' (marche)", distance: '1200m', color: '#005A32', category: 'A' },
      { label: "20' (marche)", distance: '1600m', color: '#238443', category: 'B' },
      { label: "30' (marche)", distance: '2400m', color: '#41AB5D', category: 'C' },
      { label: "15' (velo)", distance: '3700m', color: '#78C679', category: 'D' },
      { label: "20' (velo)", distance: '5000m', color: '#A1D99B', category: 'E' },
      { label: "30' (velo)", distance: '7000m', color: '#C7E9C0', category: 'F' },
      { label: "> 30' (velo)", distance: '> 7000m', color: '#EEF8EA', category: 'G' },
    ] satisfies LegendItem[],
  },
  viridis: {
    name: 'Viridis',
    colors: [
      { label: 'Très forte proximité', distance: '0-1200m', color: '#440154', category: 'A' },
      { label: 'Forte proximité', distance: '1200-1600m', color: '#443983', category: 'B' },
      { label: 'Bonne proximité', distance: '1600-2400m', color: '#31688E', category: 'C' },
      { label: 'Proximité moyenne', distance: '2400-3700m', color: '#21918C', category: 'D' },
      { label: 'Proximité faible', distance: '3700-5000m', color: '#35B779', category: 'E' },
      { label: 'Très faible proximité', distance: '5000-7000m', color: '#90D743', category: 'F' },
      { label: 'Hors proximité', distance: '> 7000m', color: '#FDE725', category: 'G' },
    ] satisfies LegendItem[],
  },
  grey: {
    name: 'Gris',
    colors: [
      { label: 'Très forte proximité', distance: '0-1200m', color: '#111827', category: 'A' },
      { label: 'Forte proximité', distance: '1200-1600m', color: '#374151', category: 'B' },
      { label: 'Bonne proximité', distance: '1600-2400m', color: '#4B5563', category: 'C' },
      { label: 'Proximité moyenne', distance: '2400-3700m', color: '#6B7280', category: 'D' },
      { label: 'Proximité faible', distance: '3700-5000m', color: '#9CA3AF', category: 'E' },
      { label: 'Très faible proximité', distance: '5000-7000m', color: '#D1D5DB', category: 'F' },
      { label: 'Hors proximité', distance: '> 7000m', color: '#F3F4F6', category: 'G' },
    ] satisfies LegendItem[],
  },
};

export type ProximityPaletteId = keyof typeof proximityColorPalettes;

export const demandVariables: DemandVariable[] = [
  { id: 'Fuss', name: 'A pied', enabled: false },
  { id: 'Velo', name: 'A velo', enabled: false },
  { id: 'Auto', name: 'En voiture', enabled: false },
  { id: 'OeV', name: 'En transports publics', enabled: false },
  { id: 'All_modes', name: 'Tous les modes', enabled: true },
];

export const supplyCategories: ProximityCategory[] = [
  {
    name: 'Tout',
    id: 'All',
    icon: 'Layers3',
    tags: [],
    infos: [],
    weight: 1,
    diversity: 5,
    enabled: true,
  },
  {
    name: 'Apprendre',
    id: 'Education',
    icon: 'GraduationCap',
    tags: ['university', 'school', 'college', 'kindergarten'],
    infos: ['Ecoles primaires', 'secondaires', 'universites', 'garderies'],
    weight: 1,
    diversity: 5,
    enabled: false,
  },
  {
    name: 'Se cultiver',
    id: 'Culture',
    icon: 'Theater',
    tags: ['arts_centre', 'library', 'theatre', 'nightclub', 'cinema', 'museum', 'events_venue', 'religion'],
    infos: ['Bibliotheques', 'theatres', 'cinemas', 'lieux de culte'],
    weight: 1,
    diversity: 5,
    enabled: false,
  },
  {
    name: 'Se soigner',
    id: 'Care',
    icon: 'HeartPulse',
    tags: ['nursing_home', 'pharmacy', 'hospital', 'clinic', 'doctors', 'dentist', 'optician', 'hairdresser', 'beauty'],
    infos: ['Pharmacies', 'hopitaux', 'dentistes', 'opticiens', 'coiffeurs', 'beaute'],
    weight: 1,
    diversity: 5,
    enabled: false,
  },
  {
    name: "S'aerer",
    id: 'Outdoor',
    icon: 'Trees',
    tags: ['park', 'playground', 'square', 'landuse_recreation_ground', 'water', 'fountain', 'riverbank', 'river'],
    infos: ['Parcs', 'places', 'fontaines', 'rives'],
    weight: 1,
    diversity: 5,
    enabled: false,
  },
  {
    name: 'Faire du sport',
    id: 'Sport',
    icon: 'Dumbbell',
    tags: ['sports_centre', 'pitch', 'swimming_pool', 'swimming', 'water_park', 'fitness_centre', 'ice_rink', 'tennis', 'golf_course', 'stadium'],
    infos: ['Piscines', 'fitness', 'stades', 'patinoires', 'tennis'],
    weight: 1,
    diversity: 5,
    enabled: false,
  },
  {
    name: 'Bien manger',
    id: 'Catering',
    icon: 'UtensilsCrossed',
    tags: ['restaurant', 'fast_food', 'cafe', 'pub', 'bar', 'food_court', 'biergarten'],
    infos: ['Restaurants', 'cafes', 'pubs'],
    weight: 1,
    diversity: 5,
    enabled: false,
  },
  {
    name: 'Faire ses courses',
    id: 'Provision',
    icon: 'ShoppingBasket',
    tags: ['marketplace', 'supermarket', 'bakery', 'general', 'butcher', 'greengrocery'],
    infos: ['Supermarches', 'boulangeries', 'marches'],
    weight: 1,
    diversity: 5,
    enabled: false,
  },
  {
    name: 'Faire les magasins',
    id: 'Shopping',
    icon: 'ShoppingBag',
    tags: ['kiosk', 'mall', 'department_store', 'convenience', 'clothes', 'florist', 'chemist', 'books', 'shoes', 'furniture'],
    infos: ['Kiosks', 'fleuristes', 'librairies', 'bricolage'],
    weight: 1,
    diversity: 5,
    enabled: false,
  },
  {
    name: 'Guichets',
    id: 'Public',
    icon: 'Landmark',
    tags: ['community_centre', 'police', 'post_box', 'post_office', 'bank'],
    infos: ['Postes', 'banques', 'police'],
    weight: 1,
    diversity: 5,
    enabled: false,
  },
  {
    name: 'Transports publics',
    id: 'Transport',
    icon: 'Train',
    tags: ['bus_station', 'taxi', 'railway', 'tram_stop', 'bus_stop'],
    infos: ['Gares', 'arrets de bus et tram', 'zone taxi'],
    weight: 1,
    diversity: 5,
    enabled: false,
  },
];

export function secureTilesName(name: string) {
  return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

export function selectedTileName(mapMode: MapMode, tilingType: TilingType) {
  return listTilesParams.find(({ name }) => name.includes(mapMode) && name.includes(tilingType))?.name ?? listTilesParams[0].name;
}

export function cleanVariableString(name: string) {
  const str = name.replace(/(-|_|\.)/g, ' ').trim();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function stepsColors(min: number, max: number, colors: string[]) {
  const diff = max - min;
  const step = diff / (colors.length - 1);
  const values: (string | number)[] = [colors[0]];

  for (let i = 1; i < colors.length; i += 1) {
    values.push(i * step + min, colors[i]);
  }

  return values as [string, ...ExpressionSpecification[]];
}

export function expressionSum(attributes: { id: string }[], distance?: number): ExpressionSpecification | number {
  if (attributes.length === 0) return 0;

  const suffix = distance !== undefined ? `_${distance}` : '';

  if (attributes.length === 1) {
    return ['to-number', ['get', `${attributes[0].id}${suffix}`]] as ExpressionSpecification;
  }

  const values = attributes.map(({ id }) => ['to-number', ['get', `${id}${suffix}`]]);
  return values.reduce((acc, curr) => ['+', acc, curr] as (string | string[])[]) as ExpressionSpecification;
}

export function expressionMax(attributes: { id: string; weight: number; diversity: number }[]): ExpressionSpecification | number {
  if (attributes.length === 0) return 0;

  if (attributes.length === 1) {
    const [attribute] = attributes;
    return ['to-number', ['get', `${attribute.diversity}_${attribute.id}`]] as ExpressionSpecification;
  }

  const values = attributes.map(({ id, weight, diversity }) => [
    '*',
    ['to-number', ['get', `${diversity}_${id}`]],
    weight,
  ]) as ExpressionSpecification[];

  return ['max', ...values] as ExpressionSpecification;
}

export function fillExpression(
  mapMode: MapMode,
  categories: ProximityCategory[],
  modes: DemandVariable[],
  distance: number,
  paletteColors: LegendItem[] = supplyColors,
): ExpressionSpecification {
  const colors = (mapMode === 'demand' ? demandColors : paletteColors).map((item) => item.color);
  const expression = mapMode === 'demand' ? expressionSum(modes, distance) : expressionMax(categories);

  return [
    'step',
    expression,
    ...stepsColors(0, mapMode === 'demand' ? 1 : 7000, colors),
  ] as ExpressionSpecification;
}
