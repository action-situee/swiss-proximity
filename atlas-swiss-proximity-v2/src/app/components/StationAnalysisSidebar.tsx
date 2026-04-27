import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProximityCategory } from '../lib/proximityData';
import {
  accessibilityMetrics,
  stationActivityScore,
  stationServiceMetrics,
  timeModeLabel,
  type Station,
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
  onStationSelect: (station: Station) => void;
}

export function StationAnalysisSidebar({
  station,
  stations,
  categories,
  timeMode,
  proximityData,
  isProximityLoading,
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

  const servicesData = stationServiceMetrics(selectedStation, categories, timeMode, proximityData);
  const accessibilityData = accessibilityMetrics(selectedStation, timeMode);
  const totalServices = servicesData.reduce((sum, item) => sum + item.count, 0);
  const accidentsCount = proximityData?.metadata?.accident_counts?.total
    ?? proximityData?.features.filter(feature => feature.properties.kind === 'accident').length
    ?? 0;

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
      </div>

      <div className="grid grid-cols-4 border-b border-gray-300">
        <Stat label="Activité" value={String(stationActivityScore(selectedStation, timeMode))} />
        <Stat label="Services" value={String(totalServices)} />
        <Stat label="Accidents" value={isProximityLoading ? '...' : String(accidentsCount)} />
        <Stat label="Lignes" value={String(selectedStation.lines.length)} />
      </div>

      <div className="flex-1 space-y-6 overflow-auto p-6">
        <section>
          <h3 className="mb-3 text-xs uppercase tracking-wider text-gray-900">Services à proximité</h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={servicesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ border: '1px solid #9ca3af', borderRadius: 0, fontSize: 12 }} />
              <Bar dataKey="count" name="Services" fill="#dc2626" />
              <Bar dataKey="weightedScore" name="Score pondéré" fill="#111827" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section>
          <h3 className="mb-3 text-xs uppercase tracking-wider text-gray-900">Accessibilité estimée</h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={accessibilityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mode" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ border: '1px solid #9ca3af', borderRadius: 0, fontSize: 12 }} />
              <Bar dataKey="5min" fill="#dc2626" />
              <Bar dataKey="10min" fill="#6b7280" />
              <Bar dataKey="15min" fill="#111827" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="border border-gray-300 p-4">
          <h3 className="mb-3 text-xs uppercase tracking-wider text-gray-900">Catégories prises en compte</h3>
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
