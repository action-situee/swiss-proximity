import { CategoryControl } from './CategoryControl';
import { CheckSquare, RotateCcw } from 'lucide-react';
import {
  listDistances,
  listYears,
  type DemandVariable,
  type MapMode,
  type ProximityCategory,
  type TilingType,
} from '../lib/proximityData';

interface ProximityPanelProps {
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
}

export function ProximityPanel({
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
}: ProximityPanelProps) {
  const visibleCategories = categories.filter(category => category.id !== 'All');
  const isAllCategoryActive = categories.some(category => category.id === 'All' && category.enabled);
  const activeCount = visibleCategories.filter(c => c.enabled).length;
  const allSelected = activeCount === visibleCategories.length || isAllCategoryActive;
  const activeDemandModes = demandModes.filter(mode => mode.enabled).length;

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="space-y-4 border-b border-gray-300 px-6 py-4">
        <SegmentedControl
          label="Carte affichee"
          value={isProximityIndexVisible ? mapMode : ''}
          options={[
            { value: 'supply', label: 'Offre' },
            { value: 'demand', label: 'Demande', disabled: true },
          ]}
          onChange={(value) => {
            if (value === mapMode && isProximityIndexVisible) {
              onProximityIndexVisibleChange(false);
              return;
            }

            onMapModeChange(value as MapMode);
            onProximityIndexVisibleChange(true);
          }}
        />

        <SegmentedControl
          label="Decoupage"
          value={tilingType}
          options={[
            { value: 'h3', label: 'H3' },
            { value: 'polygon', label: 'Secteur statistique', disabled: true },
          ]}
          onChange={(value) => onTilingTypeChange(value as TilingType)}
        />
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {mapMode === 'supply' ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">
                {isAllCategoryActive ? 'Toutes categories' : `${activeCount} / ${visibleCategories.length} categories actives`}
              </div>
              <button
                onClick={onSelectAll}
                className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-600 transition-colors hover:text-gray-900"
              >
                <CheckSquare className="h-3 w-3" />
                {allSelected ? 'Aucun' : 'Tout'}
              </button>
            </div>

            <div className="space-y-3">
              {visibleCategories.map(category => (
                <CategoryControl
                  key={category.id}
                  category={category}
                  onChange={onCategoryChange}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-500">Seuil de proximite</div>
              <div className="grid grid-cols-3 border border-gray-400">
                {listDistances.map(item => (
                  <button
                    key={item}
                    onClick={() => onDistanceChange(item)}
                    className={`px-2 py-2 text-xs transition-colors ${
                      distance === item ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {item} m
                  </button>
                ))}
              </div>
            </div>

            <SegmentedControl
              label="Scenario"
              value={String(year)}
              options={listYears.map(item => ({ value: String(item), label: String(item) }))}
              onChange={(value) => onYearChange(Number(value))}
            />

            <div>
              <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-500">
                {activeDemandModes} mode(s) actifs
              </div>
              <div className="space-y-2">
                {demandModes.map(mode => (
                  <label key={mode.id} className="flex cursor-pointer items-center justify-between border-b border-gray-200 pb-2 text-xs text-gray-800">
                    <span>{mode.name}</span>
                    <input
                      type="checkbox"
                      checked={mode.enabled}
                      onChange={(event) => onDemandModeChange({ ...mode, enabled: event.target.checked })}
                      className="h-4 w-4 accent-red-600"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-300 space-y-2">
        <button
          onClick={onReset}
          className="w-full px-3 py-1.5 border border-gray-400 text-gray-700 hover:bg-gray-50 transition-colors text-xs flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Réinitialiser
        </button>
      </div>
    </div>
  );
}

interface SegmentedControlProps {
  label: string;
  value: string;
  options: { value: string; label: string; disabled?: boolean }[];
  onChange: (value: string) => void;
}

function SegmentedControl({ label, value, options, onChange }: SegmentedControlProps) {
  return (
    <div>
      <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="grid border border-gray-400" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(option => (
          <button
            key={option.value}
            onClick={() => {
              if (!option.disabled) onChange(option.value);
            }}
            disabled={option.disabled}
            className={`px-2 py-2 text-xs transition-colors ${
              option.disabled
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : value === option.value
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
