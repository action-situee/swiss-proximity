export type ContextGeometry = 'line' | 'polygon';

export interface ContextLayerConfig {
  id: string;
  name: string;
  description: string;
  sourceUrl: string;
  catalogueUrl: string;
  geometry: ContextGeometry;
  color: string;
  enabled: boolean;
  fetchStrategy?: 'full' | 'viewport';
}

function arcgisQueryUrl(featureServerUrl: string, count = 2000) {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: '*',
    outSR: '4326',
    f: 'json',
    resultRecordCount: String(count),
  });

  return `${featureServerUrl}/0/query?${params.toString()}`;
}

export const contextLayerConfigs: ContextLayerConfig[] = [
  {
    id: 'otc-amenag-2roues',
    name: 'Aménagements cyclables',
    description: 'Pistes, bandes, sas et autres aménagements cyclables recensés par le SITG.',
    sourceUrl: arcgisQueryUrl('https://app2.ge.ch/tergeoservices/rest/services/Hosted/OTC_AMENAG_2ROUES/FeatureServer', 4000),
    catalogueUrl: 'https://sitg.ge.ch/donnees/otc-amenag-2roues',
    geometry: 'line',
    color: '#2563eb',
    enabled: false,
  },
  {
    id: 'otc-desserte-tp',
    name: 'Desserte TP',
    description: 'Qualité de desserte par les transports publics selon la méthode VSS.',
    sourceUrl: arcgisQueryUrl('https://vector.sitg.ge.ch/arcgis/rest/services/OTC_DESSERTE_TP/FeatureServer', 2000),
    catalogueUrl: 'https://sitg.ge.ch/donnees/otc-desserte-tp',
    geometry: 'polygon',
    color: '#dc2626',
    enabled: false,
  },
  {
    id: 'gmo-graphe-ferroviaire-region',
    name: 'Graphe ferroviaire régional',
    description: 'Rails train, tram, funiculaire, crémaillère et métro du graphe régional.',
    sourceUrl: arcgisQueryUrl('https://vector.sitg.ge.ch/arcgis/rest/services/GMO_GRAPHE_FERROVIAIRE_REGION/FeatureServer', 4000),
    catalogueUrl: 'https://sitg.ge.ch/donnees/gmo-graphe-ferroviaire-region',
    geometry: 'line',
    color: '#111827',
    enabled: false,
  },
  {
    id: 'sipv-ica-mnc-2023',
    name: 'Canopée 2023',
    description: 'Modèle numérique de surface de canopée, état 2023.',
    sourceUrl: arcgisQueryUrl('https://vector.sitg.ge.ch/arcgis/rest/services/Hosted/SIPV_ICA_MNC_2023/FeatureServer', 2000),
    catalogueUrl: 'https://sitg.ge.ch/donnees/sipv-ica-mnc-2023',
    geometry: 'polygon',
    color: '#16a34a',
    enabled: false,
    fetchStrategy: 'viewport',
  },
];
