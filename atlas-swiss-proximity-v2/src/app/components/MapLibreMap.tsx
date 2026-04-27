import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { addProtocol, Popup } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ContextLayerConfig } from '../lib/contextLayers';
import {
  boundsGeneva,
  boundsSwitzerland,
  cleanVariableString,
  demandColors,
  fillExpression,
  listTilesParams,
  maxBoundsSwitzerland,
  proximityColorPalettes,
  secureTilesName,
  selectedTileName,
  supplyColors,
  type DemandVariable,
  type LegendItem,
  type MapMode,
  type ProximityPaletteId,
  type ProximityCategory,
  type TilingType,
} from '../lib/proximityData';

interface MapLibreMapProps {
  activeCategories: ProximityCategory[];
  activeDemandModes: DemandVariable[];
  mapMode: MapMode;
  isProximityIndexVisible: boolean;
  tilingType: TilingType;
  distance: number;
  year: number;
  contextLayers: ContextLayerConfig[];
  onProximityIndexVisibleChange: (visible: boolean) => void;
  onContextLayerToggle: (id: string, enabled: boolean) => void;
}

const basemapStyles = {
  lightbase: '/styles/lightbase.json',
  light: '/styles/light.json',
  dark: '/styles/dark.json',
};

const protocol = new Protocol();
let isPmtilesProtocolRegistered = false;

function registerPmtilesProtocol() {
  if (isPmtilesProtocolRegistered) return;
  addProtocol('pmtiles', protocol.tile);
  isPmtilesProtocolRegistered = true;
}

function legendItems(mapMode: MapMode, paletteId: ProximityPaletteId): LegendItem[] {
  return mapMode === 'demand' ? [...demandColors].reverse() : proximityColorPalettes[paletteId].colors;
}

const desserteTpClasses = [
  { value: 'A - très bonne desserte', label: 'A', color: '#6d28d9' },
  { value: 'B - bonne desserte', label: 'B', color: '#2563eb' },
  { value: 'C - desserte moyenne', label: 'C', color: '#f59e0b' },
  { value: 'D - faible desserte', label: 'D', color: '#f97316' },
];

const canopyLegendItems = [
  { label: '3-8 m', color: '#bbf7d0' },
  { label: '8-16 m', color: '#4ade80' },
  { label: '16 m et +', color: '#166534' },
];

function contextSourceUrl(layer: ContextLayerConfig, currentMap: maplibregl.Map) {
  if (layer.fetchStrategy !== 'viewport') return layer.sourceUrl;

  const [baseUrl, query = ''] = layer.sourceUrl.split('?');
  const params = new URLSearchParams(query);
  const bounds = currentMap.getBounds();

  params.set('geometry', [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ].join(','));
  params.set('geometryType', 'esriGeometryEnvelope');
  params.set('inSR', '4326');
  params.set('outSR', '4326');
  params.set('spatialRel', 'esriSpatialRelIntersects');
  params.set('returnGeometry', 'true');

  return `${baseUrl}?${params.toString()}`;
}

function contextLayerVisibility(layer: ContextLayerConfig) {
  return layer.enabled ? 'visible' : 'none';
}

function contextLinePaint(layer: ContextLayerConfig) {
  if (layer.id === 'gmo-graphe-ferroviaire-region') {
    return {
      'line-color': '#111827',
      'line-width': 2.8,
      'line-opacity': 0.9,
    };
  }

  return {
    'line-color': layer.color,
    'line-width': 2.6,
    'line-opacity': 0.88,
  };
}

function contextFillPaint(layer: ContextLayerConfig) {
  if (layer.id === 'otc-desserte-tp') {
    return {
      'fill-color': [
        'match',
        ['get', 'CLASSE_DESSERTE'],
        ...desserteTpClasses.flatMap(item => [item.value, item.color]),
        '#e5e7eb',
      ],
      'fill-opacity': 0.38,
    };
  }

  if (layer.id === 'sipv-ica-mnc-2023') {
    return {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['coalesce', ['to-number', ['get', 'h_mean']], 0],
        3,
        '#bbf7d0',
        8,
        '#4ade80',
        16,
        '#16a34a',
        26,
        '#14532d',
      ],
      'fill-opacity': 0.68,
    };
  }

  return {
    'fill-color': layer.color,
    'fill-opacity': 0.24,
  };
}

function contextOutlinePaint(layer: ContextLayerConfig) {
  if (layer.id === 'otc-desserte-tp') {
    return {
      'line-color': [
        'match',
        ['get', 'CLASSE_DESSERTE'],
        ...desserteTpClasses.flatMap(item => [item.value, item.color]),
        '#9ca3af',
      ],
      'line-width': 1,
      'line-opacity': 0.72,
    };
  }

  if (layer.id === 'sipv-ica-mnc-2023') {
    return {
      'line-color': '#14532d',
      'line-width': 0.15,
      'line-opacity': 0.25,
    };
  }

  return {
    'line-color': layer.color,
    'line-width': 0.8,
    'line-opacity': 0.6,
  };
}

function asGeoJson(data: any): any {
  if (data?.type === 'FeatureCollection') return data;

  return {
    type: 'FeatureCollection',
    features: (data?.features ?? []).map((feature: any, index: number) => ({
      type: 'Feature',
      id: feature.attributes?.objectid ?? feature.attributes?.OBJECTID ?? index,
      geometry: esriGeometryToGeoJson(feature.geometry),
      properties: feature.attributes ?? {},
    })).filter((feature: any) => feature.geometry),
  };
}

function esriGeometryToGeoJson(geometry: any) {
  if (!geometry) return null;

  if (geometry.x !== undefined && geometry.y !== undefined) {
    return { type: 'Point', coordinates: [geometry.x, geometry.y] };
  }

  if (geometry.paths) {
    return geometry.paths.length === 1
      ? { type: 'LineString', coordinates: geometry.paths[0] }
      : { type: 'MultiLineString', coordinates: geometry.paths };
  }

  if (geometry.rings) {
    if (geometry.rings.length === 1) return { type: 'Polygon', coordinates: geometry.rings };

    return {
      type: 'MultiPolygon',
      coordinates: geometry.rings.map((ring: number[][]) => [ring]),
    };
  }

  return null;
}

export function MapLibreMap({
  activeCategories,
  activeDemandModes,
  mapMode,
  isProximityIndexVisible,
  tilingType,
  distance,
  year,
  contextLayers,
  onProximityIndexVisibleChange,
  onContextLayerToggle,
}: MapLibreMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const popup = useRef(new Popup({ closeButton: false, maxWidth: '360px' }));
  const hasAppliedInitialStyle = useRef(false);
  const latestState = useRef({ activeCategories, activeDemandModes, mapMode, tilingType, distance, contextLayers, isProximityIndexVisible });
  const contextDataCache = useRef<Record<string, any>>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleName, setStyleName] = useState<keyof typeof basemapStyles>('lightbase');
  const [paletteId, setPaletteId] = useState<ProximityPaletteId>('contrast');
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const currentTileName = useMemo(() => selectedTileName(mapMode, tilingType), [mapMode, tilingType]);
  const paletteColors = proximityColorPalettes[paletteId].colors;
  const currentExpression = useMemo(
    () => fillExpression(mapMode, activeCategories, activeDemandModes, distance, paletteColors),
    [activeCategories, activeDemandModes, distance, mapMode, paletteColors],
  );

  useEffect(() => {
    latestState.current = { activeCategories, activeDemandModes, mapMode, tilingType, distance, contextLayers, isProximityIndexVisible };
  }, [activeCategories, activeDemandModes, contextLayers, distance, isProximityIndexVisible, mapMode, tilingType]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    registerPmtilesProtocol();

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: basemapStyles[styleName],
      bounds: mapMode === 'demand' ? boundsGeneva : boundsSwitzerland,
      fitBoundsOptions: { padding: 20 },
      maxBounds: maxBoundsSwitzerland,
      minZoom: 6,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
    map.current.on('load', () => setMapLoaded(true));
    map.current.on('error', (event) => {
      if (event.error?.message !== 'Failed to fetch') console.error(event.error);
    });

    return () => {
      popup.current.remove();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded) return;

    const moveWaterAboveData = () => {
      const layers = currentMap.getStyle().layers ?? [];
      const firstSymbolLayer = layers.find((layer) => layer.type === 'symbol')?.id;

      layers
        .filter((layer) => layer.type !== 'symbol' && /water|river|stream|lake/i.test(layer.id))
        .forEach((layer) => {
          if (currentMap.getLayer(layer.id)) currentMap.moveLayer(layer.id, firstSymbolLayer);
        });
    };

    const addLayers = () => {
      if (!currentMap.isStyleLoaded()) return;

      const firstSymbolLayer = currentMap.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id;
      const state = latestState.current;
      const tileName = selectedTileName(state.mapMode, state.tilingType);
      const expression = fillExpression(state.mapMode, state.activeCategories, state.activeDemandModes, state.distance, proximityColorPalettes[paletteId].colors);

      listTilesParams.forEach((tile) => {
        const sourceId = secureTilesName(tile.name);
        const layerId = `layer-${sourceId}`;

        if (!currentMap.getSource(sourceId)) {
          currentMap.addSource(sourceId, {
            type: 'vector',
            url: tile.url,
          });
        }

        if (!currentMap.getLayer(layerId)) {
          currentMap.addLayer(
            {
              id: layerId,
              type: 'fill',
              source: sourceId,
              'source-layer': sourceId,
              layout: {
                visibility: tile.name === tileName && state.isProximityIndexVisible ? 'visible' : 'none',
              },
              paint: {
                'fill-color': expression,
                'fill-opacity': 0.62,
                'fill-outline-color': 'rgba(30, 41, 59, 0.22)',
              },
            },
            firstSymbolLayer,
          );

          currentMap.on('mousemove', layerId, (event) => {
            currentMap.getCanvas().style.cursor = 'pointer';
            const feature = event.features?.[0];
            if (!feature) return;

            const properties = feature.properties ?? {};
            const title = properties.Agglo ? `<strong>${properties.Agglo}</strong>` : '<strong>Territoire</strong>';

            const state = latestState.current;

            if (state.mapMode === 'demand') {
              const suffix = `_${state.distance}`;
              const value = state.activeDemandModes.reduce((sum, mode) => sum + Number(properties[`${mode.id}${suffix}`] ?? 0), 0);
              popup.current
                .setLngLat(event.lngLat)
                .setHTML(`${title}<br/><span>Part des deplacements &lt; ${state.distance} m: <strong>${Math.round(value * 100)}%</strong></span>`)
                .addTo(currentMap);
              return;
            }

            const selectedSidebarCategories = state.activeCategories.filter(category => category.id !== 'All');
            const html = selectedSidebarCategories
              .map((category) => {
                const value = properties[`${category.diversity}_${category.id}`];
                return `<div>${category.diversity} ${category.diversity > 1 ? 'lieux' : 'lieu'} ou ${cleanVariableString(category.name)} a moins de <strong>${value ?? '-'}</strong> m</div>`;
              })
              .join('');

            popup.current
              .setLngLat(event.lngLat)
              .setHTML(`${title}${html ? `<br/>${html}` : '<br/><span>Sélectionnez une catégorie dans la sidebar pour afficher le détail.</span>'}`)
              .addTo(currentMap);
          });

          currentMap.on('mouseleave', layerId, () => {
            currentMap.getCanvas().style.cursor = '';
            popup.current.remove();
          });
        }

        if (currentMap.getLayer(layerId)) {
          currentMap.setLayoutProperty(layerId, 'visibility', tile.name === tileName && state.isProximityIndexVisible ? 'visible' : 'none');
          currentMap.setPaintProperty(layerId, 'fill-color', expression);
        }
      });

      moveWaterAboveData();
    };

    addLayers();
    currentMap.on('style.load', addLayers);

    return () => {
      currentMap.off('style.load', addLayers);
    };
  }, [mapLoaded, paletteId]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded || !currentMap.isStyleLoaded()) return;

    contextLayers.forEach((layer) => {
      const layerId = `context-layer-${layer.id}`;
      const outlineLayerId = `context-outline-${layer.id}`;

      [layerId, outlineLayerId].forEach((id) => {
        if (currentMap.getLayer(id)) {
          currentMap.setLayoutProperty(id, 'visibility', layer.enabled ? 'visible' : 'none');
        }
      });
    });
  }, [contextLayers, mapLoaded]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded) return;

    const addContextLayers = async () => {
      if (!currentMap.isStyleLoaded()) return;

      const state = latestState.current;
      const firstSymbolLayer = currentMap.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id;

      for (const layer of state.contextLayers) {
        const sourceId = `context-source-${layer.id}`;
        const layerId = `context-layer-${layer.id}`;
        const outlineLayerId = `context-outline-${layer.id}`;
        const shouldFetchLayer = layer.enabled || layer.fetchStrategy !== 'viewport';

        if (!shouldFetchLayer) {
          [layerId, outlineLayerId].forEach((id) => {
            if (currentMap.getLayer(id)) currentMap.setLayoutProperty(id, 'visibility', 'none');
          });
          continue;
        }

        if (layer.fetchStrategy === 'viewport' || !contextDataCache.current[layer.id]) {
          try {
            const response = await fetch(contextSourceUrl(layer, currentMap));
            if (!response.ok) throw new Error(`SITG ${layer.name}: ${response.status}`);
            const data = asGeoJson(await response.json());
            contextDataCache.current[layer.id] = data;

            const existingSource = currentMap.getSource(sourceId);
            if (existingSource && 'setData' in existingSource) {
              (existingSource as maplibregl.GeoJSONSource).setData(data);
            }
          } catch (error) {
            console.error(error);
            continue;
          }
        }

        if (!currentMap.getSource(sourceId)) {
          currentMap.addSource(sourceId, {
            type: 'geojson',
            data: contextDataCache.current[layer.id],
          });
        }

        if (!currentMap.getLayer(layerId)) {
          if (layer.geometry === 'line') {
            currentMap.addLayer(
              {
                id: layerId,
                type: 'line',
                source: sourceId,
                layout: { visibility: contextLayerVisibility(layer) },
                paint: contextLinePaint(layer),
              },
              firstSymbolLayer,
            );
          } else {
            currentMap.addLayer(
              {
                id: layerId,
                type: 'fill',
                source: sourceId,
                layout: { visibility: contextLayerVisibility(layer) },
                paint: contextFillPaint(layer),
              },
              firstSymbolLayer,
            );

            currentMap.addLayer(
              {
                id: outlineLayerId,
                type: 'line',
                source: sourceId,
                layout: { visibility: contextLayerVisibility(layer) },
                paint: contextOutlinePaint(layer),
              },
              firstSymbolLayer,
            );
          }
        }

        [layerId, outlineLayerId].forEach((id) => {
          if (currentMap.getLayer(id)) {
            currentMap.setLayoutProperty(id, 'visibility', contextLayerVisibility(layer));
          }
        });
      }
    };

    const refreshViewportLayers = () => {
      const hasEnabledViewportLayer = latestState.current.contextLayers.some(
        layer => layer.enabled && layer.fetchStrategy === 'viewport',
      );

      if (hasEnabledViewportLayer) void addContextLayers();
    };

    void addContextLayers();
    currentMap.on('style.load', addContextLayers);
    currentMap.on('moveend', refreshViewportLayers);

    return () => {
      currentMap.off('style.load', addContextLayers);
      currentMap.off('moveend', refreshViewportLayers);
    };
  }, [contextLayers, mapLoaded]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded) return;

    listTilesParams.forEach(({ name }) => {
      const layerId = `layer-${secureTilesName(name)}`;
      if (currentMap.getLayer(layerId)) {
        currentMap.setLayoutProperty(layerId, 'visibility', name === currentTileName && isProximityIndexVisible ? 'visible' : 'none');
        currentMap.setPaintProperty(layerId, 'fill-color', currentExpression);
      }
    });

  }, [currentExpression, currentTileName, isProximityIndexVisible, mapLoaded]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded) return;

    currentMap.fitBounds(mapMode === 'demand' ? boundsGeneva : boundsSwitzerland, { padding: 20, duration: 700 });
  }, [mapLoaded, mapMode]);

  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded) return;

    if (!hasAppliedInitialStyle.current) {
      hasAppliedInitialStyle.current = true;
      return;
    }

    const view = {
      center: currentMap.getCenter(),
      zoom: currentMap.getZoom(),
      bearing: currentMap.getBearing(),
      pitch: currentMap.getPitch(),
    };

    currentMap.once('style.load', () => {
      currentMap.jumpTo(view);
      setTimeout(() => {
        const state = latestState.current;
        const tileName = selectedTileName(state.mapMode, state.tilingType);
        const expression = fillExpression(state.mapMode, state.activeCategories, state.activeDemandModes, state.distance, proximityColorPalettes[paletteId].colors);

        listTilesParams.forEach(({ name }) => {
          const layerId = `layer-${secureTilesName(name)}`;
          if (currentMap.getLayer(layerId)) {
            currentMap.setLayoutProperty(layerId, 'visibility', name === tileName && state.isProximityIndexVisible ? 'visible' : 'none');
            currentMap.setPaintProperty(layerId, 'fill-color', expression);
          }
        });
      }, 0);
    });
    currentMap.setStyle(basemapStyles[styleName]);
  }, [mapLoaded, styleName]);

  const items = legendItems(mapMode, paletteId);

  return (
    <div className="relative h-full w-full bg-gray-100">
      <div ref={mapContainer} className="h-full w-full" />

      <div className="absolute left-16 top-4 flex border border-gray-400 bg-white shadow-sm">
        <select
          value={styleName}
          onChange={(event) => setStyleName(event.target.value as keyof typeof basemapStyles)}
          className="border-r border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 outline-none"
          aria-label="Fond de carte"
        >
          <option value="lightbase">Lightbase</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <select
          value={paletteId}
          onChange={(event) => setPaletteId(event.target.value as ProximityPaletteId)}
          className="bg-white px-3 py-2 text-xs text-gray-800 outline-none"
          aria-label="Palette de couleur"
        >
          {Object.entries(proximityColorPalettes).map(([id, palette]) => (
            <option key={id} value={id}>{palette.name}</option>
          ))}
        </select>
      </div>

      <div className="absolute right-4 top-4 min-w-[180px] border border-gray-400 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm">
        <div className="font-medium text-gray-900">{mapMode === 'demand' ? 'Demande' : 'Offre'}</div>
        <div>{tilingType === 'h3' ? 'Hexagones H3' : 'Secteur statistique'}</div>
        <div>{mapMode === 'demand' ? `${distance} m · ${year}` : `${activeCategories.length} categorie(s)`}</div>
      </div>

      <div className="absolute right-4 top-28 max-h-[calc(100%-9rem)] max-w-[270px] overflow-auto border border-gray-400 bg-white px-3 py-2 shadow-sm">
        <button
          onClick={() => setIsLegendOpen(value => !value)}
          className="flex w-full items-center justify-between gap-4 text-[10px] uppercase tracking-wider text-gray-600"
        >
          <span>Légende</span>
          <span>{isLegendOpen ? 'Masquer' : 'Afficher'}</span>
        </button>
        {isLegendOpen && (
          <div className="mt-3 space-y-4">
            <div>
              <button
                type="button"
                onClick={() => onProximityIndexVisibleChange(!isProximityIndexVisible)}
                aria-pressed={isProximityIndexVisible}
                className={`mb-2 flex w-full items-center justify-between gap-3 text-left text-[10px] uppercase tracking-wider transition-opacity ${
                  isProximityIndexVisible ? 'text-gray-600 opacity-100' : 'text-gray-400 opacity-60'
                }`}
              >
                <span>Indice de proximité</span>
                <span>{isProximityIndexVisible ? 'On' : 'Off'}</span>
              </button>
              <div className="space-y-1">
                {items.map((item) => (
                  <div key={`${item.category}-${item.label}`} className="flex items-center gap-2 text-xs text-gray-700">
                    <div className="h-3 w-5 border border-gray-300" style={{ backgroundColor: item.color }} />
                    <span className="min-w-4 font-medium">{item.category}</span>
                    <span className="truncate">{item.distance} {item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-500">Contexte SITG</div>
              <div className="space-y-1">
                {contextLayers.map((layer) => (
                  <div key={layer.id}>
                    <button
                      onClick={() => onContextLayerToggle(layer.id, !layer.enabled)}
                      className={`flex w-full items-center gap-2 text-left text-xs ${layer.enabled ? 'text-gray-800' : 'text-gray-400'} hover:text-gray-900`}
                    >
                      <div
                        className="h-3 w-5 border border-gray-300"
                        style={{ backgroundColor: layer.enabled ? layer.color : '#f3f4f6' }}
                      />
                      <span className="flex-1 truncate">{layer.name}</span>
                      <span className="text-[10px] uppercase tracking-wider">{layer.enabled ? 'On' : 'Off'}</span>
                    </button>

                    {layer.enabled && layer.id === 'otc-desserte-tp' && (
                      <div className="ml-7 mt-1 grid grid-cols-2 gap-1">
                        {desserteTpClasses.map((item) => (
                          <div key={item.value} className="flex items-center gap-1 text-[10px] text-gray-600">
                            <span className="h-2.5 w-4 border border-gray-300" style={{ backgroundColor: item.color }} />
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {layer.enabled && layer.id === 'sipv-ica-mnc-2023' && (
                      <div className="ml-7 mt-1 space-y-1">
                        {canopyLegendItems.map((item) => (
                          <div key={item.label} className="flex items-center gap-1 text-[10px] text-gray-600">
                            <span className="h-2.5 w-4 border border-gray-300" style={{ backgroundColor: item.color }} />
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs uppercase tracking-wider text-gray-500">
          Chargement de la carte
        </div>
      )}

      <div className="absolute bottom-3 left-4 max-w-[calc(100%-2rem)] bg-white/85 px-2 py-1 text-[10px] text-gray-500">
        © OpenStreetMap Contributors · 2026 Bureau Action Située · Données EPFL LASUR
      </div>
    </div>
  );
}
