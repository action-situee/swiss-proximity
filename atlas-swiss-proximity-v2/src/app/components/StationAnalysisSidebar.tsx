import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProximityCategory } from '../lib/proximityData';
import {
  stationActivityScore,
  stationAccidentMetrics,
  stationAnalysisThemes,
  stationLayerMetrics,
  stationRingMetrics,
  stationServiceMetrics,
  stationThemeMetrics,
  timeModeLabel,
  type Station,
  type StationAnalysisThemeId,
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
  onAnalysisThemeChange: (theme: StationAnalysisThemeId) => void;
  onStationSelect: (station: Station) => void;
}

export function StationAnalysisSidebar({
  station,
  stations,
  categories,
  timeMode,
  proximityData,
  isProximityLoading,
  activeAnalysisTheme,
  onAnalysisThemeChange,
  onStationSelect,
}: StationAnalysisSidebarProps) {
  const selectedStation = station ?? stations[0];
  if (!selectedStation) {
    return (
      <aside className="flex h-full w-[500px] items-center justify-center border-l border-gray-300 bg-white text-xs uppercase tracking-wider text-gray-500">
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

  return (
    <aside className="flex h-full w-[500px] flex-col border-l border-gray-300 bg-white">
      <div className="border-b border-gray-300 px-6 py-5">
        <div className="mb-3 text-[10px] uppercase tracking-wider text-gray-500">Analyse d'arrêt</div>
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
        <div className="mt-3 text-xs text-gray-600">
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

      <div className="grid grid-cols-4 border-b border-gray-300">
        <Stat label="Score" value={String(stationActivityScore(selectedStation, timeMode))} />
        <Stat label="Équip." value={isProximityLoading ? '...' : String(totalServices)} />
        <Stat label="Accidents" value={isProximityLoading ? '...' : String(accidentsCount)} />
        <Stat label="Graves" value={isProximityLoading ? '...' : String(accidentData.seriousOrFatal)} />
      </div>

      <div className="border-b border-gray-300 px-6 py-4">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-500">Analyses thématiques</div>
        <div className="grid grid-cols-2 gap-2">
          {stationAnalysisThemes.map(theme => (
            <button
              key={theme.id}
              type="button"
              onClick={() => onAnalysisThemeChange(theme.id)}
              aria-pressed={activeAnalysisTheme === theme.id}
              className={`border px-3 py-2 text-left text-xs ${activeAnalysisTheme === theme.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <span className="block font-medium">{theme.shortLabel}</span>
              <span className={`mt-0.5 block text-[10px] ${activeAnalysisTheme === theme.id ? 'text-gray-200' : 'text-gray-500'}`}>
                {theme.thematicLayerIds.length + theme.equipmentLayerIds.length} couches
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-auto p-6">
        <section className="border border-gray-300 p-4">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">Thème actif</div>
          <h3 className="mb-2 text-sm font-medium text-gray-900">{themeData.theme.label}</h3>
          <p className="mb-4 text-xs leading-5 text-gray-600">{themeData.theme.objective}</p>
          <div className="grid grid-cols-4 border border-gray-300 text-center text-xs">
            <MiniStat label="Objets" value={isProximityLoading ? '...' : String(themeData.total)} />
            <MiniStat label="Points" value={isProximityLoading ? '...' : String(themeData.points)} />
            <MiniStat label="Lignes" value={isProximityLoading ? '...' : String(themeData.lines)} />
            <MiniStat label="Surfaces" value={isProximityLoading ? '...' : String(themeData.polygons)} />
          </div>
          {(activeAnalysisTheme === 'safety' || activeAnalysisTheme === 'activeMobility') && (
            <div className="mt-3 grid grid-cols-2 border border-gray-300 text-center text-xs">
              <MiniStat label="Accidents" value={isProximityLoading ? '...' : String(themeData.accidents)} />
              <MiniStat label="Graves" value={isProximityLoading ? '...' : String(themeData.severeAccidents)} />
            </div>
          )}
          {activeAnalysisTheme === 'urbanism' && (
            <div className="mt-3 grid grid-cols-3 border border-gray-300 text-center text-xs">
              <MiniStat label="Bâtiments" value={isProximityLoading ? '...' : String(themeData.urbanism.buildings)} />
              <MiniStat label="Projets" value={isProximityLoading ? '...' : String(themeData.urbanism.projects)} />
              <MiniStat label="m2/ha" value={isProximityLoading ? '...' : String(themeData.urbanism.builtDensityM2Ha)} />
            </div>
          )}
        </section>

        {activeAnalysisTheme === 'urbanism' && (
          <section className="border border-gray-300 p-4">
            <h3 className="mb-3 text-xs uppercase tracking-wider text-gray-900">Indicateurs urbains</h3>
            <div className="grid grid-cols-2 border border-gray-300 text-center text-xs">
              <MiniStat label="Habitants" value={isProximityLoading ? '...' : String(themeData.urbanism.population)} />
              <MiniStat label="Emplois" value={isProximityLoading ? '...' : String(themeData.urbanism.employment)} />
              <MiniStat label="Emp./hab." value={isProximityLoading ? '...' : String(themeData.urbanism.jobsPerResident ?? '-')} />
              <MiniStat label="Haut. moy." value={isProximityLoading ? '...' : `${themeData.urbanism.averageHeight} m`} />
            </div>
            <div className="mt-3 grid grid-cols-2 border border-gray-300 text-center text-xs">
              <MiniStat label="Dens. pop." value={isProximityLoading ? '...' : `${themeData.urbanism.averagePopDensity}/ha`} />
              <MiniStat label="Dens. emp." value={isProximityLoading ? '...' : `${themeData.urbanism.averageEmpDensity}/ha`} />
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-3 text-xs uppercase tracking-wider text-gray-900">Couches du thème</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={themeData.byLayer}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ border: '1px solid #9ca3af', borderRadius: 0, fontSize: 12 }} />
              <Bar dataKey="count" name="Objets" fill="#111827" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section>
          <h3 className="mb-3 text-xs uppercase tracking-wider text-gray-900">Équipements publics à 1000 m</h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={servicesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ border: '1px solid #9ca3af', borderRadius: 0, fontSize: 12 }} />
              <Bar dataKey="count" name="Équipements" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section>
          <h3 className="mb-3 text-xs uppercase tracking-wider text-gray-900">Répartition par anneau</h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={ringData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="ring" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ border: '1px solid #9ca3af', borderRadius: 0, fontSize: 12 }} />
              <Bar dataKey="services" name="Équipements" fill="#2563eb" />
              <Bar dataKey="accidents" name="Accidents" fill="#f97316" />
              <Bar dataKey="severe" name="Graves/mortels" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section>
          <h3 className="mb-3 text-xs uppercase tracking-wider text-gray-900">Sécurité vélos/piétons</h3>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={accidentData.bySeverity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ border: '1px solid #9ca3af', borderRadius: 0, fontSize: 12 }} />
              <Bar dataKey="count" name="Personnes / accidents" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-3 border border-gray-300 text-center text-xs">
            <MiniStat label="Piétons" value={String(accidentData.pedestrians)} />
            <MiniStat label="Vélos" value={String(accidentData.bikes)} />
            <MiniStat label="Nuit" value={String(accidentData.night)} />
          </div>
        </section>

        <section className="border border-gray-300 p-4">
          <h3 className="mb-3 text-xs uppercase tracking-wider text-gray-900">Détails utiles</h3>
          <div className="space-y-2">
            {servicesData.length > 0 ? servicesData.map(item => (
              <div key={item.id} className="flex items-center justify-between border-b border-gray-200 pb-2 text-xs">
                <span className="text-gray-700">{item.category}</span>
                <span className="font-medium text-gray-900">{item.count}</span>
              </div>
            )) : (
              <div className="text-xs text-gray-500">
                {isProximityLoading ? 'Chargement des équipements' : 'Aucun équipement pour les catégories actives'}
              </div>
            )}
          </div>
          {accidentData.byCommune.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-500">Communes les plus exposées</div>
              {accidentData.byCommune.map(item => (
                <div key={item.commune} className="flex items-center justify-between border-b border-gray-200 pb-2 text-xs">
                  <span className="text-gray-700">{item.commune}</span>
                  <span className="font-medium text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
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
