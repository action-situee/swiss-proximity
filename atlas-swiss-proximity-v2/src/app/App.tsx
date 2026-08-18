import { useEffect, useMemo, useState } from 'react';
import { AnalysisPanel } from './components/AnalysisPanel';
import { MapLibreMap } from './components/MapLibreMap';
import { Sidebar } from './components/Sidebar';
import { StationAnalysisSidebar } from './components/StationAnalysisSidebar';
import { TabNavigation, type DataMode, type TabType, type TimeMode } from './components/TabNavigation';
import { TransportStationsMap } from './components/TransportStationsMap';
import { WelcomeInfoDialog } from './components/WelcomeInfoDialog';
import { contextLayerConfigs, type ContextLayerConfig } from './lib/contextLayers';
import {
  demandVariables,
  supplyCategories,
  type DemandVariable,
  type MapMode,
  type ProximityCategory,
  type TilingType,
} from './lib/proximityData';
import {
  fetchRealTransportStations,
  fetchStationProximityDataForStation,
  fetchStationProximityManifest,
  getInitialStation,
  type Station,
  type StationAnalysisThemeId,
  type StationManifestEntry,
  type StationProximityData,
} from './lib/stationData';

const PUBLISHED_SECTIONS_ENABLED: boolean = false;
const PUBLISHED_CONTEXT_LAYERS: ContextLayerConfig[] = [];

function loadSessionValue<T>(key: string, fallback: T): T {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function saveSessionValue<T>(key: string, value: T) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

function loadCategories() {
  const saved = loadSessionValue<ProximityCategory[]>('categories', supplyCategories);
  const savedIds = new Set(saved.map(category => category.id));

  if (!supplyCategories.every(category => savedIds.has(category.id))) return supplyCategories;

  return supplyCategories.map(category => ({
    ...category,
    ...saved.find(savedCategory => savedCategory.id === category.id),
    infos: category.infos,
    tags: category.tags,
    icon: category.icon,
  }));
}

function loadDemandModes() {
  const saved = loadSessionValue<DemandVariable[]>('demandModes', demandVariables);
  const savedIds = new Set(saved.map(mode => mode.id));

  if (!demandVariables.every(mode => savedIds.has(mode.id))) return demandVariables;

  return demandVariables.map(mode => ({
    ...mode,
    ...saved.find(savedMode => savedMode.id === mode.id),
  }));
}

function loadContextLayers() {
  const saved = loadSessionValue<ContextLayerConfig[]>('contextLayers', contextLayerConfigs);
  const savedById = new Map(saved.map(layer => [layer.id, layer]));

  return contextLayerConfigs.map(layer => ({
    ...layer,
    enabled: savedById.get(layer.id)?.enabled ?? layer.enabled,
  }));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [dataMode, setDataMode] = useState<DataMode>('proximity');
  const [timeMode, setTimeMode] = useState<TimeMode>('24h');
  const [mapMode, setMapMode] = useState<MapMode>('supply');
  const [isProximityIndexVisible, setIsProximityIndexVisible] = useState(() => loadSessionValue('proximityIndexVisible', true));
  const [tilingType, setTilingType] = useState<TilingType>('h3');
  const [distance, setDistance] = useState(() => loadSessionValue('distance', 7000));
  const [year, setYear] = useState(() => loadSessionValue('year', 2017));
  const [categories, setCategories] = useState<ProximityCategory[]>(loadCategories);
  const [demandModes, setDemandModes] = useState<DemandVariable[]>(loadDemandModes);
  const [selectedStation, setSelectedStation] = useState<Station | null>(getInitialStation);
  const [transportStations, setTransportStations] = useState<Station[]>([getInitialStation()]);
  const [stationProximityData, setStationProximityData] = useState<StationProximityData | null>(null);
  const [isStationProximityLoading, setIsStationProximityLoading] = useState(false);
  const [stationAnalysisTheme, setStationAnalysisTheme] = useState<StationAnalysisThemeId>('amenities');
  const [manifestEntries, setManifestEntries] = useState<StationManifestEntry[]>([]);
  const [contextLayers, setContextLayers] = useState<ContextLayerConfig[]>(loadContextLayers);
  const [isInfoOpen, setIsInfoOpen] = useState(() => sessionStorage.getItem('welcomeSeen') !== 'true');

  useEffect(() => saveSessionValue('mapMode', mapMode), [mapMode]);
  useEffect(() => saveSessionValue('proximityIndexVisible', isProximityIndexVisible), [isProximityIndexVisible]);
  useEffect(() => saveSessionValue('tilingType', tilingType), [tilingType]);
  useEffect(() => saveSessionValue('distance', distance), [distance]);
  useEffect(() => saveSessionValue('year', year), [year]);
  useEffect(() => saveSessionValue('categories', categories), [categories]);
  useEffect(() => saveSessionValue('demandModes', demandModes), [demandModes]);
  useEffect(() => saveSessionValue('contextLayers', contextLayers), [contextLayers]);

  useEffect(() => {
    if (!PUBLISHED_SECTIONS_ENABLED) return;

    fetchStationProximityManifest()
      .then(manifest => setManifestEntries(Object.values(manifest.stations)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!PUBLISHED_SECTIONS_ENABLED) return;

    let isMounted = true;

    fetchRealTransportStations()
      .then((stations) => {
        if (!isMounted) return;
        setTransportStations(stations);
        setSelectedStation(current => {
          if (current?.source === 'AGGLO_GARES' || current?.source === 'TPG_ARRETS') return stations.find(station => station.id === current.id) ?? current;
          return stations.find(station => station.name === 'Genève-Cornavin')
            ?? stations.find(station => station.name === 'Genève')
            ?? stations[0]
            ?? null;
        });
      })
      .catch((error) => {
        console.error('Impossible de charger les arrêts TPG réels', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!PUBLISHED_SECTIONS_ENABLED) {
      setStationProximityData(null);
      setIsStationProximityLoading(false);
      return;
    }

    if (!selectedStation) {
      setStationProximityData(null);
      return;
    }

    let isMounted = true;
    setIsStationProximityLoading(true);

    fetchStationProximityDataForStation(selectedStation, stationAnalysisTheme)
      .then((data) => {
        if (isMounted) setStationProximityData(data);
      })
      .catch((error) => {
        console.error(`Impossible de charger les équipements de ${selectedStation.id}`, error);
        if (isMounted) setStationProximityData(null);
      })
      .finally(() => {
        if (isMounted) setIsStationProximityLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedStation, stationAnalysisTheme]);

  const activeCategories = useMemo(
    () => categories.filter(category => category.enabled && category.weight > 0 && category.diversity > 0),
    [categories],
  );
  const activeDemandModes = useMemo(() => demandModes.filter(mode => mode.enabled), [demandModes]);
  const publishedContextLayers = PUBLISHED_SECTIONS_ENABLED ? contextLayers : PUBLISHED_CONTEXT_LAYERS;

  const handleCategoryChange = (updatedCategory: ProximityCategory) => {
    setCategories(prev => {
      if (updatedCategory.id === 'All' && updatedCategory.enabled) {
        return prev.map(category => ({ ...category, enabled: category.id === 'All' }));
      }

      return prev.map(category => {
        if (category.id === 'All') return { ...category, enabled: false };
        return category.id === updatedCategory.id ? updatedCategory : category;
      });
    });
  };

  const handleDemandModeChange = (updatedMode: DemandVariable) => {
    setDemandModes(prev => {
      if (updatedMode.id === 'All_modes' && updatedMode.enabled) {
        return prev.map(mode => ({ ...mode, enabled: mode.id === 'All_modes' }));
      }

      const next = prev.map(mode => {
        if (mode.id === 'All_modes') return { ...mode, enabled: false };
        return mode.id === updatedMode.id ? updatedMode : mode;
      });

      return next.some(mode => mode.enabled) ? next : demandVariables;
    });
  };

  const handleReset = () => {
    setCategories(supplyCategories);
    setDemandModes(demandVariables);
    setMapMode('supply');
    setIsProximityIndexVisible(true);
    setTilingType('h3');
    setDistance(7000);
    setYear(2017);
  };

  const handleSelectAll = () => {
    const selectableCategories = categories.filter(category => category.id !== 'All');
    const allIndividualSelected = selectableCategories.every(category => category.enabled);
    const isAllCategoryActive = categories.some(category => category.id === 'All' && category.enabled);
    const allSelected = allIndividualSelected || isAllCategoryActive;

    setCategories(prev => prev.map(category => ({
      ...category,
      enabled: allSelected ? false : category.id !== 'All',
    })));
  };

  const handleContextLayerToggle = (id: string, enabled: boolean) => {
    if (!PUBLISHED_SECTIONS_ENABLED) return;
    setContextLayers(prev => prev.map(layer => layer.id === id ? { ...layer, enabled } : layer));
  };

  return (
    <div className="flex size-full flex-col bg-white">
      <TabNavigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (PUBLISHED_SECTIONS_ENABLED || tab === 'map') setActiveTab(tab);
        }}
        dataMode={dataMode}
        onDataModeChange={setDataMode}
        timeMode={timeMode}
        onTimeModeChange={setTimeMode}
        onInfoOpen={() => setIsInfoOpen(true)}
        showUnpublishedSections={PUBLISHED_SECTIONS_ENABLED}
        showWorkInProgressTabs={!PUBLISHED_SECTIONS_ENABLED}
      />

      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'map' && (
          <>
            <Sidebar
              categories={categories}
              demandModes={demandModes}
              mapMode={mapMode}
              isProximityIndexVisible={isProximityIndexVisible}
              tilingType={tilingType}
              distance={distance}
              year={year}
              onCategoryChange={handleCategoryChange}
              onDemandModeChange={handleDemandModeChange}
              onMapModeChange={setMapMode}
              onProximityIndexVisibleChange={setIsProximityIndexVisible}
              onTilingTypeChange={setTilingType}
              onDistanceChange={setDistance}
              onYearChange={setYear}
              onReset={handleReset}
              onSelectAll={handleSelectAll}
              contextLayers={publishedContextLayers}
              onContextLayerToggle={handleContextLayerToggle}
              showContextTab={PUBLISHED_SECTIONS_ENABLED}
              showDisabledContextTab={!PUBLISHED_SECTIONS_ENABLED}
            />
            <main className="min-w-0 flex-1 overflow-hidden p-2">
              <div className="h-full border border-gray-400 bg-white">
                <MapLibreMap
                  activeCategories={activeCategories}
                  activeDemandModes={activeDemandModes}
                  mapMode={mapMode}
                  isProximityIndexVisible={isProximityIndexVisible}
                  tilingType={tilingType}
                  distance={distance}
                  year={year}
                  contextLayers={publishedContextLayers}
                  onProximityIndexVisibleChange={setIsProximityIndexVisible}
                  onContextLayerToggle={handleContextLayerToggle}
                />
              </div>
            </main>
          </>
        )}

        {PUBLISHED_SECTIONS_ENABLED && activeTab === 'analysis' && (
          <main className="flex-1 p-4">
            <div className="h-full border border-gray-400 bg-white">
              <AnalysisPanel
                categories={categories}
                demandModes={demandModes}
                mapMode={mapMode}
                tilingType={tilingType}
                distance={distance}
                year={year}
                dataMode={dataMode}
                timeMode={timeMode}
                manifestEntries={manifestEntries}
                selectedStation={selectedStation}
              />
            </div>
          </main>
        )}

        {PUBLISHED_SECTIONS_ENABLED && activeTab === 'stations' && (
          <main className="flex flex-1 overflow-hidden">
            <div className="flex-1 p-4">
              <div className="h-full border border-gray-400 bg-white">
                <TransportStationsMap
                  categories={categories}
                  stations={transportStations}
                  selectedStation={selectedStation}
                  timeMode={timeMode}
                  proximityData={stationProximityData}
                  isProximityLoading={isStationProximityLoading}
                  activeAnalysisTheme={stationAnalysisTheme}
                  onStationSelect={setSelectedStation}
                />
              </div>
            </div>
            <StationAnalysisSidebar
              station={selectedStation}
              stations={transportStations}
              categories={categories}
              timeMode={timeMode}
              proximityData={stationProximityData}
              isProximityLoading={isStationProximityLoading}
              activeAnalysisTheme={stationAnalysisTheme}
              manifestEntries={manifestEntries}
              onAnalysisThemeChange={setStationAnalysisTheme}
              onStationSelect={setSelectedStation}
            />
          </main>
        )}
      </div>

      <WelcomeInfoDialog
        open={isInfoOpen}
        onClose={() => {
          sessionStorage.setItem('welcomeSeen', 'true');
          setIsInfoOpen(false);
        }}
      />
    </div>
  );
}
