import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { addProtocol, Popup } from 'maplibre-gl';
import { Box, Compass, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
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

type BasemapStyle = 'voyager' | 'swissLight' | 'swissImagery' | 'none';

const basemapStyleUrls: Record<Exclude<BasemapStyle, 'none'>, string> = {
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  swissLight: 'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.lightbasemap.vt/style.json',
  swissImagery: 'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.imagerybasemap.vt/style.json',
};

const blankStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#FFFFFF' } }],
};

function getBasemapStyle(name: BasemapStyle): string | maplibregl.StyleSpecification {
  return name === 'none' ? blankStyle : basemapStyleUrls[name];
}

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

type ScaleMark = { width: number; label: string };

function computeScaleMark(currentMap: maplibregl.Map): ScaleMark | null {
  const canvas = currentMap.getCanvas();
  const dpr = window.devicePixelRatio || 1;
  const cx = canvas.width / dpr / 2;
  const cy = canvas.height / dpr / 2;
  const range = 60;
  const left = currentMap.unproject([cx - range, cy]);
  const right = currentMap.unproject([cx + range, cy]);
  const meters = left.distanceTo(right);
  if (!meters || !isFinite(meters)) return null;
  const magnitude = Math.pow(10, Math.floor(Math.log10(meters)));
  const factor = meters / magnitude;
  const nice = factor < 1.5 ? 1 : factor < 3 ? 2 : factor < 7 ? 5 : 10;
  const niceMeters = nice * magnitude;
  const pixelWidth = Math.round((2 * range) * niceMeters / meters);
  const label = niceMeters >= 1000 ? `${niceMeters / 1000} km` : `${niceMeters} m`;
  return { width: Math.min(pixelWidth, 120), label };
}

const selectStyle: React.CSSProperties = {
  height: 32,
  borderRadius: 0,
  border: '1px solid #9ca3af',
  background: '#ffffff',
  color: '#374151',
  fontSize: 11,
  padding: '0 28px 0 8px',
  cursor: 'pointer',
  outline: 'none',
  flexShrink: 0,
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
};

const desserteTpClasses = [
  { value: 'A - très bonne desserte', label: 'A', color: '#6d28d9' },
  { value: 'B - bonne desserte', label: 'B', color: '#2563eb' },
  { value: 'C - desserte moyenne', label: 'C', color: '#f59e0b' },
  { value: 'D - faible desserte', label: 'D', color: '#f97316' },
];


function contextSourceUrl(layer: ContextLayerConfig, currentMap: maplibregl.Map) {
  if (layer.fetchStrategy !== 'viewport') return layer.sourceUrl;

  const [baseUrl, query = ''] = layer.sourceUrl.split('?');
  const params = new URLSearchParams(query);
  const bounds = currentMap.getBounds();

  params.set('geometry', [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(','));
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
    return { 'line-color': '#111827', 'line-width': 2.8, 'line-opacity': 0.9 };
  }
  return { 'line-color': layer.color, 'line-width': 2.6, 'line-opacity': 0.88 };
}

function contextFillPaint(layer: ContextLayerConfig) {
  if (layer.id === 'otc-desserte-tp') {
    return {
      'fill-color': [
        'match', ['get', 'CLASSE_DESSERTE'],
        ...desserteTpClasses.flatMap(item => [item.value, item.color]),
        '#e5e7eb',
      ],
      'fill-opacity': 0.38,
    };
  }


  return { 'fill-color': layer.color, 'fill-opacity': 0.24 };
}

function contextOutlinePaint(layer: ContextLayerConfig) {
  if (layer.id === 'otc-desserte-tp') {
    return {
      'line-color': [
        'match', ['get', 'CLASSE_DESSERTE'],
        ...desserteTpClasses.flatMap(item => [item.value, item.color]),
        '#9ca3af',
      ],
      'line-width': 1,
      'line-opacity': 0.72,
    };
  }


  return { 'line-color': layer.color, 'line-width': 0.8, 'line-opacity': 0.6 };
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

function MapButton({
  active = false,
  children,
  style: propStyle,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      style={{
        width: 32,
        height: 32,
        borderRadius: 0,
        border: '1px solid #9ca3af',
        background: active ? '#111827' : '#ffffff',
        color: active ? '#ffffff' : '#374151',
        transition: 'background 150ms, color 150ms',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: 0,
        ...propStyle,
      }}
      {...props}
    >
      {children}
    </button>
  );
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
  const addLayersRef = useRef<() => void>(() => {});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleName, setStyleName] = useState<BasemapStyle>('voyager');
  const [paletteId, setPaletteId] = useState<ProximityPaletteId>('contrast');
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [bearing, setBearing] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [showLabels, setShowLabels] = useState(true);
  const [scaleMark, setScaleMark] = useState<ScaleMark | null>(null);

  const currentTileName = useMemo(() => selectedTileName(mapMode, tilingType), [mapMode, tilingType]);
  const paletteColors = proximityColorPalettes[paletteId].colors;
  const currentExpression = useMemo(
    () => fillExpression(mapMode, activeCategories, activeDemandModes, distance, paletteColors),
    [activeCategories, activeDemandModes, distance, mapMode, paletteColors],
  );

  const isPerspective = pitch > 10;
  const absBearing = Math.abs(bearing % 360);
  const isNorthAligned = Math.min(absBearing, 360 - absBearing) < 1;

  useEffect(() => {
    latestState.current = { activeCategories, activeDemandModes, mapMode, tilingType, distance, contextLayers, isProximityIndexVisible };
  }, [activeCategories, activeDemandModes, contextLayers, distance, isProximityIndexVisible, mapMode, tilingType]);

  // Map initialization
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    registerPmtilesProtocol();

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getBasemapStyle(styleName),
      bounds: mapMode === 'demand' ? boundsGeneva : boundsSwitzerland,
      fitBoundsOptions: { padding: 20 },
      maxBounds: maxBoundsSwitzerland,
      minZoom: 6,
      attributionControl: false,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      if (map.current) setScaleMark(computeScaleMark(map.current));
    });
    map.current.on('error', (event) => {
      if (event.error?.message !== 'Failed to fetch') console.error(event.error);
    });

    return () => {
      popup.current.remove();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Camera state tracking
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded) return;

    const update = () => {
      setBearing(currentMap.getBearing());
      setPitch(currentMap.getPitch());
      setScaleMark(computeScaleMark(currentMap));
    };

    currentMap.on('move', update);
    return () => { currentMap.off('move', update); };
  }, [mapLoaded]);

  // Add H3 / proximity layers
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
      const firstSymbolLayer = currentMap.getStyle().layers?.find((layer) => layer.type === 'symbol')?.id;
      const state = latestState.current;
      const tileName = selectedTileName(state.mapMode, state.tilingType);
      const expression = fillExpression(state.mapMode, state.activeCategories, state.activeDemandModes, state.distance, proximityColorPalettes[paletteId].colors);

      listTilesParams.forEach((tile) => {
        const sourceId = secureTilesName(tile.name);
        const layerId = `layer-${sourceId}`;

        if (!currentMap.getSource(sourceId)) {
          currentMap.addSource(sourceId, { type: 'vector', url: tile.url });
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

    addLayersRef.current = addLayers;
    addLayers();
    currentMap.on('style.load', addLayers);

    return () => { currentMap.off('style.load', addLayers); };
  }, [mapLoaded, paletteId]);

  // Context layers visibility quick-update
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

  // Add context layers from SITG
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
          currentMap.addSource(sourceId, { type: 'geojson', data: contextDataCache.current[layer.id] });
        }

        if (!currentMap.getLayer(layerId)) {
          if (layer.geometry === 'line') {
            currentMap.addLayer(
              { id: layerId, type: 'line', source: sourceId, layout: { visibility: contextLayerVisibility(layer) }, paint: contextLinePaint(layer) },
              firstSymbolLayer,
            );
          } else {
            currentMap.addLayer(
              { id: layerId, type: 'fill', source: sourceId, layout: { visibility: contextLayerVisibility(layer) }, paint: contextFillPaint(layer) },
              firstSymbolLayer,
            );
            currentMap.addLayer(
              { id: outlineLayerId, type: 'line', source: sourceId, layout: { visibility: contextLayerVisibility(layer) }, paint: contextOutlinePaint(layer) },
              firstSymbolLayer,
            );
          }
        }

        [layerId, outlineLayerId].forEach((id) => {
          if (currentMap.getLayer(id)) currentMap.setLayoutProperty(id, 'visibility', contextLayerVisibility(layer));
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

  // Update tile visibility/expression when filters change
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

  // Reset bounds when mapMode changes
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded) return;
    currentMap.fitBounds(mapMode === 'demand' ? boundsGeneva : boundsSwitzerland, { padding: 20, duration: 700 });
  }, [mapLoaded, mapMode]);

  // Handle basemap style changes
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
      addLayersRef.current();
    });
    currentMap.setStyle(getBasemapStyle(styleName));
  }, [mapLoaded, styleName]);

  // Re-hide labels after style change if showLabels is off
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !mapLoaded) return;

    const applyLabels = () => {
      if (showLabels) return;
      currentMap.getStyle()?.layers?.forEach(layer => {
        if (layer.type === 'symbol') {
          try { currentMap.setLayoutProperty(layer.id, 'visibility', 'none'); } catch { /* skip */ }
        }
      });
    };

    currentMap.on('style.load', applyLabels);
    return () => { currentMap.off('style.load', applyLabels); };
  }, [showLabels, mapLoaded]);

  // Keyboard shortcuts: T = labels, O = perspective, N = north
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === 'T' || e.key === 't') {
        const currentMap = map.current;
        if (!currentMap) return;
        setShowLabels(prev => {
          const next = !prev;
          currentMap.getStyle()?.layers?.forEach(layer => {
            if (layer.type === 'symbol') {
              try { currentMap.setLayoutProperty(layer.id, 'visibility', next ? 'visible' : 'none'); } catch { /* skip */ }
            }
          });
          return next;
        });
      }

      if (e.key === 'O' || e.key === 'o') {
        const currentMap = map.current;
        if (!currentMap) return;
        const p = currentMap.getPitch();
        const b = currentMap.getBearing();
        const abs = Math.abs(b % 360);
        const northAligned = Math.min(abs, 360 - abs) < 1;
        if (p > 10) {
          currentMap.flyTo({ pitch: 0, bearing: 0, duration: 500 });
        } else {
          currentMap.flyTo({ pitch: 55, bearing: northAligned ? -18 : b, duration: 500 });
        }
      }

      if (e.key === 'N' || e.key === 'n') {
        map.current?.easeTo({ bearing: 0, duration: 350 });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleResetView = () => {
    map.current?.fitBounds(
      mapMode === 'demand' ? boundsGeneva : boundsSwitzerland,
      { padding: 20, duration: 700, bearing: 0, pitch: 0 },
    );
  };

  const handleTogglePerspective = () => {
    const currentMap = map.current;
    if (!currentMap) return;
    if (isPerspective) {
      currentMap.flyTo({ pitch: 0, bearing: 0, duration: 500 });
    } else {
      currentMap.flyTo({ pitch: 55, bearing: isNorthAligned ? -18 : bearing, duration: 500 });
    }
  };

  const handleToggleLabels = () => {
    const currentMap = map.current;
    if (!currentMap) return;
    const next = !showLabels;
    setShowLabels(next);
    currentMap.getStyle()?.layers?.forEach(layer => {
      if (layer.type === 'symbol') {
        try { currentMap.setLayoutProperty(layer.id, 'visibility', next ? 'visible' : 'none'); } catch { /* skip */ }
      }
    });
  };

  const handleResetNorth = () => {
    map.current?.easeTo({ bearing: 0, duration: 350 });
  };

  const items = legendItems(mapMode, paletteId);

  return (
    <div className="relative h-full w-full bg-gray-100">
      <style>{`
        .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right { display: none !important; }
      `}</style>

      <div ref={mapContainer} className="h-full w-full" />

      {/* Legend panel — opens upward, anchored near the Légende button (left side) */}
      {isLegendOpen && (
        <div className="absolute max-w-[270px] overflow-auto border border-gray-400 bg-white px-3 py-2" style={{ bottom: 44, left: 12, maxHeight: 'calc(100% - 60px)', zIndex: 20 }}>
          <div className="space-y-4">
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

                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs uppercase tracking-wider text-gray-500">
          Chargement de la carte
        </div>
      )}

      {/* Bottom control bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 4, background: 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(209,213,219,0.5)', zIndex: 10 }}>
        <MapButton onClick={() => map.current?.zoomIn()} title="Zoom avant">
          <ZoomIn size={16} />
        </MapButton>

        <MapButton onClick={() => map.current?.zoomOut()} title="Zoom arrière">
          <ZoomOut size={16} />
        </MapButton>

        <MapButton onClick={handleResetView} title="Recentrer">
          <Maximize2 size={16} />
        </MapButton>

        <MapButton
          onClick={handleTogglePerspective}
          title="Perspective / orientation (O)"
          active={isPerspective}
          aria-pressed={isPerspective}
        >
          <Box size={16} />
        </MapButton>

        <MapButton
          onClick={handleToggleLabels}
          title="Afficher les noms (T)"
          active={!showLabels}
          aria-pressed={!showLabels}
        >
          <span style={{ fontFamily: 'Arial', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>T</span>
        </MapButton>

        <MapButton
          onClick={handleResetNorth}
          title="Remettre le nord en haut (N)"
          active={!isNorthAligned}
          aria-pressed={!isNorthAligned}
        >
          <Compass
            size={16}
            style={{ transform: `rotate(${-bearing}deg)`, transition: 'transform 100ms linear' }}
          />
        </MapButton>

        <div style={{ width: 1, height: 20, background: '#d1d5db', margin: '0 4px', flexShrink: 0 }} />

        <select
          value={styleName}
          onChange={(e) => setStyleName(e.target.value as BasemapStyle)}
          title="Fond de carte"
          style={selectStyle}
        >
          <option value="voyager">Voyager</option>
          <option value="swissLight">Swiss Light</option>
          <option value="swissImagery">Swiss Imagerie</option>
          <option value="none">Sans fond</option>
        </select>

        <select
          value={paletteId}
          onChange={(e) => setPaletteId(e.target.value as ProximityPaletteId)}
          title="Palette de couleur"
          aria-label="Palette de couleur"
          style={selectStyle}
        >
          {Object.entries(proximityColorPalettes).map(([id, palette]) => (
            <option key={id} value={id}>{palette.name}</option>
          ))}
        </select>

        <button
          onClick={() => setIsLegendOpen(v => !v)}
          title="Légende"
          style={{
            height: 32, padding: '0 10px', borderRadius: 0,
            border: '1px solid #9ca3af',
            background: isLegendOpen ? '#111827' : '#ffffff',
            color: isLegendOpen ? '#ffffff' : '#374151',
            fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase',
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          Légende
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {scaleMark && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: scaleMark.width, height: 3, borderLeft: '1px solid #9ca3af', borderRight: '1px solid #9ca3af', borderBottom: '1px solid #9ca3af' }} />
              <span style={{ fontSize: 9, color: '#6b7280', fontFamily: 'Arial', marginTop: 1 }}>{scaleMark.label}</span>
            </div>
          )}
          <span style={{ fontSize: 9, color: '#9ca3af', fontFamily: 'Arial', whiteSpace: 'nowrap' }}>
            © OpenStreetMap · BAS 2026
          </span>
        </div>
      </div>
    </div>
  );
}
