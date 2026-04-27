import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ContextPanel } from './ContextPanel';
import { ProximityPanel } from './ProximityPanel';
import type { ContextLayerConfig } from '../lib/contextLayers';
import type { DemandVariable, MapMode, ProximityCategory, TilingType } from '../lib/proximityData';

interface SidebarProps {
  categories: ProximityCategory[];
  demandModes: DemandVariable[];
  mapMode: MapMode;
  isProximityIndexVisible: boolean;
  tilingType: TilingType;
  distance: number;
  year: number;
  onCategoryChange: (category: ProximityCategory) => void;
  onDemandModeChange: (mode: DemandVariable) => void;
  onMapModeChange: (mode: MapMode) => void;
  onProximityIndexVisibleChange: (visible: boolean) => void;
  onTilingTypeChange: (type: TilingType) => void;
  onDistanceChange: (distance: number) => void;
  onYearChange: (year: number) => void;
  onReset: () => void;
  onSelectAll: () => void;
  contextLayers: ContextLayerConfig[];
  onContextLayerToggle: (id: string, enabled: boolean) => void;
}

export function Sidebar({
  categories,
  demandModes,
  mapMode,
  isProximityIndexVisible,
  tilingType,
  distance,
  year,
  onCategoryChange,
  onDemandModeChange,
  onMapModeChange,
  onProximityIndexVisibleChange,
  onTilingTypeChange,
  onDistanceChange,
  onYearChange,
  onReset,
  onSelectAll,
  contextLayers,
  onContextLayerToggle,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'categories' | 'context'>('categories');

  if (isCollapsed) {
    return (
      <div className="w-12 border-r border-gray-300 bg-white flex flex-col">
        <button
          onClick={() => setIsCollapsed(false)}
          className="h-12 border-b border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 border-r border-gray-300 bg-white flex flex-col">
      <div className="border-b border-gray-300 flex">
        <button
          onClick={() => setActiveSubTab('categories')}
          className={`flex-1 border-b-2 px-4 py-3 text-xs uppercase tracking-wider transition-colors ${
            activeSubTab === 'categories'
              ? 'border-red-600 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Catégories
        </button>
        <button
          onClick={() => setActiveSubTab('context')}
          className={`flex-1 border-b-2 px-4 py-3 text-xs uppercase tracking-wider transition-colors ${
            activeSubTab === 'context'
              ? 'border-red-600 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Contexte
        </button>
        <button
          onClick={() => setIsCollapsed(true)}
          className="w-12 border-l border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {activeSubTab === 'categories' ? (
        <ProximityPanel
          categories={categories}
          demandModes={demandModes}
          mapMode={mapMode}
          isProximityIndexVisible={isProximityIndexVisible}
          tilingType={tilingType}
          distance={distance}
          year={year}
          onCategoryChange={onCategoryChange}
          onDemandModeChange={onDemandModeChange}
          onMapModeChange={onMapModeChange}
          onProximityIndexVisibleChange={onProximityIndexVisibleChange}
          onTilingTypeChange={onTilingTypeChange}
          onDistanceChange={onDistanceChange}
          onYearChange={onYearChange}
          onReset={onReset}
          onSelectAll={onSelectAll}
        />
      ) : (
        <ContextPanel layers={contextLayers} onLayerToggle={onContextLayerToggle} />
      )}
    </div>
  );
}
