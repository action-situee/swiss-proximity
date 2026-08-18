import { BarChart3, Info } from 'lucide-react';

export type TabType = 'map' | 'analysis' | 'stations';
export type DataMode = 'proximity' | 'mobility';
export type TimeMode = 'day' | 'night' | '24h';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  dataMode: DataMode;
  onDataModeChange: (mode: DataMode) => void;
  timeMode: TimeMode;
  onTimeModeChange: (mode: TimeMode) => void;
  onInfoOpen: () => void;
  showUnpublishedSections?: boolean;
  showWorkInProgressTabs?: boolean;
}

export function TabNavigation({
  activeTab,
  onTabChange,
  dataMode,
  onDataModeChange,
  timeMode,
  onTimeModeChange,
  onInfoOpen,
  showUnpublishedSections = false,
  showWorkInProgressTabs = false,
}: TabNavigationProps) {
  const tabs = [
    { id: 'map' as TabType, label: 'Courtes distances', disabled: false },
    ...(showUnpublishedSections
      ? [
          { id: 'analysis' as TabType, label: 'Analyse', icon: BarChart3, disabled: false },
        ]
      : []),
    ...(!showUnpublishedSections && showWorkInProgressTabs
      ? [
          { id: 'analysis' as TabType, label: 'Analyse', icon: BarChart3, disabled: true, badge: 'WIP' },
        ]
      : []),
  ];

  return (
    <div className="bg-white border-b border-gray-300">
      <div className="flex items-center justify-between gap-6 px-6 py-3">
        <div className="flex items-center gap-3">
          <img src="/brand/situee-logo.svg" alt="située" className="h-10 w-auto" />
          <div>
            <h1 className="text-base tracking-tight text-gray-900">
              Swiss Proximity : territoires des courtes distances
            </h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Agglomérations transfrontalières suisses
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Data Mode Toggle */}
          <div className="flex border border-gray-400">
            <button
              onClick={() => onDataModeChange('proximity')}
              className={`px-4 py-1.5 text-xs uppercase tracking-wider transition-colors ${
                dataMode === 'proximity'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Proximité
            </button>
            <button
              onClick={() => onDataModeChange('mobility')}
              disabled
              className="cursor-not-allowed border-l border-gray-400 bg-gray-100 px-4 py-1.5 text-xs uppercase tracking-wider text-gray-400"
            >
              Mobilité
            </button>
          </div>

          <div className="flex border border-gray-400">
            <button
              onClick={() => onTimeModeChange('day')}
              disabled
              className="cursor-not-allowed bg-gray-100 px-4 py-1.5 text-xs uppercase tracking-wider text-gray-400"
            >
              Jour
            </button>
            <button
              onClick={() => onTimeModeChange('night')}
              disabled
              className="cursor-not-allowed border-l border-gray-400 bg-gray-100 px-4 py-1.5 text-xs uppercase tracking-wider text-gray-400"
            >
              Nuit
            </button>
            <button
              onClick={() => onTimeModeChange('24h')}
              className="border-l border-gray-400 bg-gray-900 px-4 py-1.5 text-xs uppercase tracking-wider text-white"
            >
              24h
            </button>
          </div>

          <button
            onClick={onInfoOpen}
            className="flex h-8 w-8 items-center justify-center border border-gray-400 text-gray-700 hover:bg-gray-50"
            aria-label="Infos et mode d'emploi"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>
      {tabs.length > 1 && (
        <nav className="flex gap-0 justify-center">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (!tab.disabled) onTabChange(tab.id);
                }}
                disabled={tab.disabled}
                aria-label={tab.disabled ? `${tab.label} — en préparation` : tab.label}
                className={`flex items-center gap-2 px-5 py-2.5 border-b-2 transition-colors ${
                  tab.disabled
                    ? 'cursor-not-allowed border-transparent text-gray-400'
                    :
                  isActive
                    ? 'text-red-600 border-red-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span className="text-sm">{tab.label}</span>
                {'badge' in tab && tab.badge && (
                  <span className="border border-gray-300 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-gray-400">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
