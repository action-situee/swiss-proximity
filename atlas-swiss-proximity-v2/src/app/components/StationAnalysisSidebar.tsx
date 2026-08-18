import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProximityCategory } from '../lib/proximityData';
import {
  stationActivityScore,
  stationAccidentMetrics,
  stationAnalysisThemes,
  stationEssentialCoverage,
  stationEquipmentPercentile,
  stationGradient500m,
  stationLayerMetrics,
  stationRingMetrics,
  stationSafetyRate,
  stationServiceMetrics,
  stationThemeMetrics,
  timeModeLabel,
  type Station,
  type StationAnalysisThemeId,
  type StationManifestEntry,
  type StationProximityData,
  type TimeMode,
} from '../lib/stationData';

interface StationAnalysisSidebarProps {
  station: Station | null;
  stations: Station[];
  categories: ProximityCategory[];
  timeMode: TimeMode;
  proximityData: StationProximityData | null;
  isProximityLoading: boolean;
  activeAnalysisTheme: StationAnalysisThemeId;
  manifestEntries?: StationManifestEntry[];
  onAnalysisThemeChange: (theme: StationAnalysisThemeId) => void;
  onStationSelect: (station: Station) => void;
}

type ChartView = 'theme' | 'rings' | 'safety';

export function StationAnalysisSidebar({
  station,
  stations,
  categories,
  timeMode,
  proximityData,
  isProximityLoading,
  activeAnalysisTheme,
  manifestEntries = [],
  onAnalysisThemeChange,
  onStationSelect,
}: StationAnalysisSidebarProps) {
  const [chartView, setChartView] = useState<ChartView>('theme');
  const [detailsOpen, setDetailsOpen] = useState(false);

  const selectedStation = station ?? stations[0];
  if (!selectedStation) {
    return (
      <aside className="flex h-full w-[400px] items-center justify-center border-l border-gray-300 bg-white text-xs uppercase tracking-wider text-gray-500">
        Chargement des arrêts
      </aside>
    );
  }

  const servicesData = proximityData ? stationLayerMetrics(proximityData) : stationServiceMetrics(selectedStation, categories, timeMode, proximityData);
  const ringData = stationRingMetrics(proximityData);
  const accidentData = stationAccidentMetrics(proximityData);
  const themeData = stationThemeMetrics(proximityData, activeAnalysisTheme);
  const totalServices = servicesData.reduce((sum, item) => sum + item.count, 0);
  const accidentsCount = accidentData.total;
  const facilities = selectedStation.facilities;
  const hasSafety = activeAnalysisTheme === 'safety' || activeAnalysisTheme === 'activeMobility';

  // Network context stats
  const currentEquipmentCount = proximityData?.metadata?.station?.equipment_count ?? 0;
  const percentileRank = stationEquipmentPercentile(selectedStation.id, currentEquipmentCount, manifestEntries);
  const gradient500 = stationGradient500m(proximityData);
  const coverage = stationEssentialCoverage(proximityData);
  const safetyRate = stationSafetyRate(proximityData);

  return (
    <aside className="flex h-full w-[400px] flex-col border-l border-gray-300 bg-white">
      {/* Header: station selector */}
      <div className="border-b border-gray-300 px-5 py-4">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-500">Analyse d'arrêt</div>
        <select
          value={selectedStation.id}
          onChange={(event) => {
            const nextStation = stations.find(item => item.id === event.target.value);
            if (nextStation) onStationSelect(nextStation);
          }}
          className="w-full border border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
          aria-label="Arrêt analysé"
        >
          {stations.map(item => (
            <option key={item.id} value={item.id}>{item.type} · {item.name}</option>
          ))}
        </select>
        <div className="mt-2 text-xs text-gray-500">
          {selectedStation?.type} · lignes {selectedStation?.lines.join(', ')} · {timeModeLabel(timeMode)}
        </div>
        {facilities && (
          <div className="mt-3 grid grid-cols-4 gap-1 text-[10px] uppercase tracking-wider">
            <Facility active={facilities.bikeParking} label="Vélo" />
            <Facility active={facilities.carParking} label="Auto" />
            <Facility active={facilities.carSharing} label="Auto-part." />
            <Facility active={facilities.ticketOffice} label="Guichet" />
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 border-b border-gray-300">
        <Stat label="Score" value={String(stationActivityScore(selectedStation, timeMode))} />
        <Stat label="Équip." value={isProximityLoading ? '...' : String(totalServices)} />
        <Stat label="Accidents" value={isProximityLoading ? '...' : String(accidentsCount)} />
        <Stat label="Graves" value={isProximityLoading ? '...' : String(accidentData.seriousOrFatal)} />
      </div>

      {/* Theme selector */}
      <div className="border-b border-gray-300 px-5 py-3">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-500">Thème d'analyse</div>
        <div className="grid grid-cols-2 gap-1.5">
          {stationAnalysisThemes.map(theme => (
            <button
              key={theme.id}
              type="button"
              onClick={() => onAnalysisThemeChange(theme.id)}
              aria-pressed={activeAnalysisTheme === theme.id}
              className={`border px-3 py-2 text-left text-xs transition-colors ${activeAnalysisTheme === theme.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <span className="block font-medium">{theme.shortLabel}</span>
              <span className={`mt-0.5 block text-[10px] ${activeAnalysisTheme === theme.id ? 'text-gray-300' : 'text-gray-400'}`}>
                {theme.thematicLayerIds.length + theme.equipmentLayerIds.length} couches
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-auto">
        {/* Theme context */}
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">Thème actif</div>
          <div className="mb-1 text-sm font-medium text-gray-900">{themeData.theme.label}</div>
          <p className="mb-3 text-xs leading-5 text-gray-500">{themeData.theme.objective}</p>
          <div className="grid grid-cols-4 border border-gray-200 text-center text-xs">
            <MiniStat label="Objets" value={isProximityLoading ? '...' : String(themeData.total)} />
            <MiniStat label="Points" value={isProximityLoading ? '...' : String(themeData.points)} />
            <MiniStat label="Lignes" value={isProximityLoading ? '...' : String(themeData.lines)} />
            <MiniStat label="Surfaces" value={isProximityLoading ? '...' : String(themeData.polygons)} />
          </div>
          {hasSafety && (
            <div className="mt-2 grid grid-cols-2 border border-gray-200 text-center text-xs">
              <MiniStat label="Accidents" value={isProximityLoading ? '...' : String(themeData.accidents)} />
              <MiniStat label="Graves" value={isProximityLoading ? '...' : String(themeData.severeAccidents)} />
            </div>
          )}
          {activeAnalysisTheme === 'urbanism' && (
            <div className="mt-2 grid grid-cols-3 border border-gray-200 text-center text-xs">
              <MiniStat label="Bâtiments" value={isProximityLoading ? '...' : String(themeData.urbanism.buildings)} />
              <MiniStat label="Hab." value={isProximityLoading ? '...' : String(themeData.urbanism.population)} />
              <MiniStat label="Emplois" value={isProximityLoading ? '...' : String(themeData.urbanism.employment)} />
            </div>
          )}
        </div>

        {/* Chart view switcher */}
        <div className="border-b border-gray-200">
          <div className="flex border-b border-gray-200">
            {(['theme', 'rings', 'safety'] as const).map(view => (
              <button
                key={view}
                type="button"
                onClick={() => setChartView(view)}
                className={`flex-1 px-3 py-2.5 text-[10px] uppercase tracking-wider transition-colors ${chartView === view ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {view === 'theme' ? 'Couches' : view === 'rings' ? 'Anneaux' : 'Sécurité'}
              </button>
            ))}
          </div>

          <div className="px-4 py-4">
            {chartView === 'theme' && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={themeData.byLayer} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ border: '1px solid #9ca3af', borderRadius: 0, fontSize: 11 }} />
                  <Bar dataKey="count" name="Objets" fill="#111827" />
                </BarChart>
              </ResponsiveContainer>
            )}

            {chartView === 'rings' && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ringData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="ring" tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ border: '1px solid #9ca3af', borderRadius: 0, fontSize: 11 }} />
                  <Bar dataKey="services" name="Équipements" fill="#2563eb" />
                  <Bar dataKey="accidents" name="Accidents" fill="#f97316" />
                  <Bar dataKey="severe" name="Graves/mortels" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            )}

            {chartView === 'safety' && (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={accidentData.bySeverity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
                    <Tooltip contentStyle={{ border: '1px solid #9ca3af', borderRadius: 0, fontSize: 11 }} />
                    <Bar dataKey="count" name="Personnes / accidents" fill="#dc2626" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-3 border border-gray-200 text-center text-xs">
                  <MiniStat label="Piétons" value={String(accidentData.pedestrians)} />
                  <MiniStat label="Vélos" value={String(accidentData.bikes)} />
                  <MiniStat label="Nuit" value={String(accidentData.night)} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Contexte réseau */}
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="mb-3 text-[10px] uppercase tracking-wider text-gray-500">Contexte réseau</div>
          <div className="space-y-3.5">
            <NetworkIndicator
              label="Rang équipements"
              value={isProximityLoading ? '...' : percentileRank >= 0 ? `Top ${100 - percentileRank}%` : '–'}
              fill={percentileRank >= 0 ? percentileRank : null}
              title={percentileRank >= 0 ? `Meilleur que ${percentileRank}% des arrêts du réseau` : undefined}
            />
            <NetworkIndicator
              label="Équipements à 500 m"
              value={isProximityLoading ? '...' : gradient500 >= 0 ? `${gradient500}%` : '–'}
              fill={gradient500 >= 0 ? gradient500 : null}
              title={gradient500 >= 0 ? `${gradient500}% des équipements se trouvent dans les 500 premiers mètres` : undefined}
            />
            <NetworkIndicator
              label="Services essentiels"
              value={isProximityLoading ? '...' : coverage.outOf > 0 ? `${coverage.present} / ${coverage.outOf}` : '–'}
              fill={coverage.outOf > 0 ? Math.round((coverage.present / coverage.outOf) * 100) : null}
              title={coverage.outOf > 0 ? `${coverage.present} catégorie(s) de services essentiels présentes sur ${coverage.outOf}` : undefined}
            />
            <NetworkIndicator
              label="Gravité accidents"
              value={isProximityLoading ? '...' : safetyRate.total > 0 ? `${safetyRate.rate}% · réseau ${safetyRate.networkRate}%` : '–'}
              fill={safetyRate.total > 0 ? safetyRate.rate : null}
              fillColor={safetyRate.total > 0 && safetyRate.rate > safetyRate.networkRate ? '#dc2626' : '#111827'}
              title={safetyRate.total > 0 ? `${safetyRate.rate}% d'accidents graves ou mortels (référence réseau : ${safetyRate.networkRate}%)` : undefined}
            />
          </div>
        </div>

        {/* Détails collapsible */}
        <div className="border-b border-gray-200">
          <button
            type="button"
            onClick={() => setDetailsOpen(v => !v)}
            className="flex w-full items-center justify-between px-5 py-3 text-[10px] uppercase tracking-wider text-gray-500 hover:bg-gray-50"
          >
            <span>Détails équipements</span>
            <span className="text-gray-400">{detailsOpen ? '▲' : '▼'}</span>
          </button>
          {detailsOpen && (
            <div className="px-5 pb-4">
              <div className="space-y-1.5">
                {servicesData.length > 0 ? servicesData.map(item => (
                  <div key={item.id} className="flex items-center justify-between border-b border-gray-100 pb-1.5 text-xs">
                    <span className="text-gray-600">{item.category}</span>
                    <span className="font-medium text-gray-900">{item.count}</span>
                  </div>
                )) : (
                  <div className="text-xs text-gray-500">
                    {isProximityLoading ? 'Chargement des équipements' : 'Aucun équipement pour les catégories actives'}
                  </div>
                )}
              </div>
              {accidentData.byCommune.length > 0 && (
                <div className="mt-3">
                  <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-500">Communes exposées</div>
                  {accidentData.byCommune.map(item => (
                    <div key={item.commune} className="flex items-center justify-between border-b border-gray-100 pb-1.5 text-xs">
                      <span className="text-gray-600">{item.commune}</span>
                      <span className="font-medium text-gray-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Urbanism extras (only when theme active) */}
        {activeAnalysisTheme === 'urbanism' && (
          <div className="px-5 py-4">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-500">Indicateurs urbains</div>
            <div className="grid grid-cols-2 border border-gray-200 text-center text-xs">
              <MiniStat label="Emp./hab." value={isProximityLoading ? '...' : String(themeData.urbanism.jobsPerResident ?? '-')} />
              <MiniStat label="Haut. moy." value={isProximityLoading ? '...' : `${themeData.urbanism.averageHeight} m`} />
              <MiniStat label="Dens. pop." value={isProximityLoading ? '...' : `${themeData.urbanism.averagePopDensity}/ha`} />
              <MiniStat label="Dens. emp." value={isProximityLoading ? '...' : `${themeData.urbanism.averageEmpDensity}/ha`} />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function NetworkIndicator({ label, value, fill, fillColor, title }: {
  label: string;
  value: string;
  fill: number | null;
  fillColor?: string;
  title?: string;
}) {
  return (
    <div title={title}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
        <span className="text-xs font-medium text-gray-900 tabular-nums">{value}</span>
      </div>
      <div className="h-0.5 w-full bg-gray-100">
        {fill !== null && (
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, fill))}%`, backgroundColor: fillColor ?? '#111827' }}
          />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-gray-300 p-4 last:border-r-0">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-2xl text-gray-900">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-gray-300 p-3 last:border-r-0">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-lg text-gray-900">{value}</div>
    </div>
  );
}

function Facility({ active, label }: { active?: boolean; label: string }) {
  return (
    <span className={`border px-1.5 py-1 text-center ${active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-400'}`}>
      {label}
    </span>
  );
}
