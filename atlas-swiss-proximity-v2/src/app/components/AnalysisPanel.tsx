import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  listTilesParams,
  selectedTileName,
  type DemandVariable,
  type MapMode,
  type ProximityCategory,
  type TilingType,
} from '../lib/proximityData';
import { type Station, type StationManifestEntry } from '../lib/stationData';

interface AnalysisPanelProps {
  categories: ProximityCategory[];
  demandModes: DemandVariable[];
  mapMode: MapMode;
  tilingType: TilingType;
  distance: number;
  year: number;
  dataMode: 'proximity' | 'mobility';
  timeMode: 'day' | 'night' | '24h';
  manifestEntries: StationManifestEntry[];
  selectedStation: Station | null;
}

const BIN_EDGES = [0, 100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, Infinity];
const BIN_LABELS = ['<100', '100–250', '250–500', '500–750', '750–1k', '1k–1.5k', '1.5k–2k', '2k–2.5k', '2.5k–3k', '>3k'];

function quantile(sorted: number[], q: number): number {
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * q)))];
}

export function AnalysisPanel({
  categories,
  mapMode,
  tilingType,
  manifestEntries,
  selectedStation,
}: AnalysisPanelProps) {
  const networkStats = useMemo(() => {
    if (manifestEntries.length === 0) return null;
    const lex = manifestEntries.filter(e => e.network === 'Léman Express');
    const tpg = manifestEntries.filter(e => e.network === 'TPG');
    const allEq = [...manifestEntries].map(e => e.equipment_count).sort((a, b) => a - b);
    const lexEq = lex.map(e => e.equipment_count).sort((a, b) => a - b);
    const tpgEq = tpg.map(e => e.equipment_count).sort((a, b) => a - b);
    const p10 = quantile(allEq, 0.1);
    const p90 = quantile(allEq, 0.9);
    return {
      total: manifestEntries.length,
      nLex: lex.length,
      nTpg: tpg.length,
      medianAll: quantile(allEq, 0.5),
      medianLex: quantile(lexEq, 0.5),
      medianTpg: quantile(tpgEq, 0.5),
      p10,
      p25: quantile(allEq, 0.25),
      p75: quantile(allEq, 0.75),
      p90,
      ratio: p10 > 0 ? (p90 / p10).toFixed(1) : '–',
      totalAccidents: manifestEntries.reduce((s, e) => s + e.accident_count, 0),
      top3: [...manifestEntries].sort((a, b) => b.equipment_count - a.equipment_count).slice(0, 3),
      bottom3: [...manifestEntries].sort((a, b) => a.equipment_count - b.equipment_count).slice(0, 3),
      lexP25: quantile(lexEq, 0.25),
      lexP75: quantile(lexEq, 0.75),
      tpgP25: quantile(tpgEq, 0.25),
      tpgP75: quantile(tpgEq, 0.75),
    };
  }, [manifestEntries]);

  const histogramData = useMemo(() => {
    if (manifestEntries.length === 0) return [];
    const selectedEq = selectedStation
      ? (manifestEntries.find(e => e.id === selectedStation.id)?.equipment_count ?? -1)
      : -1;
    const counts = Array<number>(BIN_LABELS.length).fill(0);
    for (const e of manifestEntries) {
      for (let i = 0; i < BIN_EDGES.length - 1; i++) {
        if (e.equipment_count >= BIN_EDGES[i] && e.equipment_count < BIN_EDGES[i + 1]) {
          counts[i]++;
          break;
        }
      }
    }
    return BIN_LABELS.map((label, i) => ({
      label,
      count: counts[i],
      active: selectedEq >= BIN_EDGES[i] && selectedEq < BIN_EDGES[i + 1],
    }));
  }, [manifestEntries, selectedStation]);

  const selectedRank = useMemo(() => {
    if (!selectedStation || manifestEntries.length < 10) return null;
    const entry = manifestEntries.find(e => e.id === selectedStation.id);
    const count = entry?.equipment_count ?? 0;
    const below = manifestEntries.filter(e => e.equipment_count < count).length;
    return {
      percentile: Math.round((below / manifestEntries.length) * 100),
      count,
    };
  }, [selectedStation, manifestEntries]);

  const sidebarCategories = categories.filter(c => c.id !== 'All');
  const activeCategories = sidebarCategories.filter(c => c.enabled && c.weight > 0);
  const tileName = selectedTileName(mapMode, tilingType);
  const tile = listTilesParams.find(item => item.name === tileName);
  const rankedCategories = [...activeCategories]
    .map(c => ({ id: c.id, name: c.name, score: Math.round(c.weight * c.diversity * 100) }))
    .sort((a, b) => b.score - a.score);

  if (manifestEntries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs uppercase tracking-wider text-gray-400">
        Chargement du manifest
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-white">
      <div className="border-b border-gray-300 px-8 py-5">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">Analyse réseau</div>
        <h2 className="text-xl text-gray-900">Vue d'ensemble — {networkStats?.total} arrêts</h2>
      </div>

      {networkStats && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-4 border-b border-gray-300">
            <Stat
              label="Arrêts"
              value={String(networkStats.total)}
              sub={`${networkStats.nLex} LEX · ${networkStats.nTpg} TPG`}
            />
            <Stat
              label="Médiane équip."
              value={String(networkStats.medianAll)}
              sub="à 1000 m"
            />
            <Stat
              label="Disparité"
              value={`${networkStats.ratio}×`}
              sub="P90 / P10"
            />
            <Stat
              label="Accidents indexés"
              value={networkStats.totalAccidents.toLocaleString('fr-CH')}
              sub="périmètre 1000 m"
            />
          </div>

          {/* Distribution */}
          <div className="border-b border-gray-300 px-8 py-5">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">
              Distribution — équipements par arrêt (1000 m)
            </div>
            {selectedStation && (
              <div className="mb-3 text-xs text-gray-500">
                Arrêt actif ({selectedStation.name}) mis en évidence en bleu.
              </div>
            )}
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={histogramData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{ border: '1px solid #9ca3af', borderRadius: 0, fontSize: 11 }}
                  formatter={(v: number) => [`${v} arrêts`, 'N']}
                />
                <Bar dataKey="count" name="Arrêts">
                  {histogramData.map((entry, i) => (
                    <Cell key={i} fill={entry.active ? '#2563eb' : '#111827'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* LEX vs TPG */}
          <div className="border-b border-gray-300 px-8 py-5">
            <div className="mb-3 text-[10px] uppercase tracking-wider text-gray-500">
              Comparaison Léman Express vs TPG
            </div>
            <div className="grid grid-cols-2 gap-4">
              <NetworkBox
                label="Léman Express"
                n={networkStats.nLex}
                median={networkStats.medianLex}
                p25={networkStats.lexP25}
                p75={networkStats.lexP75}
                color="#dc2626"
                maxMedian={Math.max(networkStats.medianLex, networkStats.medianTpg)}
              />
              <NetworkBox
                label="TPG"
                n={networkStats.nTpg}
                median={networkStats.medianTpg}
                p25={networkStats.tpgP25}
                p75={networkStats.tpgP75}
                color="#2563eb"
                maxMedian={Math.max(networkStats.medianLex, networkStats.medianTpg)}
              />
            </div>
          </div>

          {/* Disparité */}
          <div className="border-b border-gray-300 px-8 py-5">
            <div className="mb-3 text-[10px] uppercase tracking-wider text-gray-500">
              Disparité d'accessibilité entre arrêts
            </div>
            <div className="mb-4 grid grid-cols-5 border border-gray-200 text-center text-xs">
              {(
                [
                  ['P10', networkStats.p10],
                  ['P25', networkStats.p25],
                  ['Médiane', networkStats.medianAll],
                  ['P75', networkStats.p75],
                  ['P90', networkStats.p90],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="border-r border-gray-200 p-3 last:border-r-0">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
                  <div className="text-lg text-gray-900">{value}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-400">Mieux équipés</div>
                {networkStats.top3.map(s => (
                  <div key={s.id} className="flex justify-between border-b border-gray-100 py-1 text-gray-700">
                    <span className="truncate pr-2">{s.name}</span>
                    <span className="shrink-0 font-medium text-gray-900">{s.equipment_count}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-400">Moins équipés</div>
                {networkStats.bottom3.map(s => (
                  <div key={s.id} className="flex justify-between border-b border-gray-100 py-1 text-gray-700">
                    <span className="truncate pr-2">{s.name}</span>
                    <span className="shrink-0 font-medium text-gray-900">{s.equipment_count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selected station rank */}
          {selectedRank && selectedStation && (
            <div className="border-b border-gray-300 px-8 py-5">
              <div className="mb-3 text-[10px] uppercase tracking-wider text-gray-500">
                Classement de l'arrêt actif
              </div>
              <div className="mb-1 text-sm font-medium text-gray-900">{selectedStation.name}</div>
              <div className="mb-3 text-xs text-gray-500">
                {selectedRank.count} équipements · meilleur que {selectedRank.percentile}% des arrêts du réseau
              </div>
              <div className="h-2 w-full bg-gray-100">
                <div
                  className="h-full bg-gray-900 transition-all duration-500"
                  style={{ width: `${selectedRank.percentile}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                <span>Moins équipés</span>
                <span>Mieux équipés</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Configuration active */}
      {rankedCategories.length > 0 && (
        <div className="px-8 py-5">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">
            Configuration active — catégories structurantes
          </div>
          <div className="mb-4 text-xs text-gray-400">
            Score = pondération × diversité · source: {tileName.replaceAll('_', ' ')}
            {tile?.url && <span className="ml-1 break-all">{tile.url}</span>}
          </div>
          <ResponsiveContainer width="100%" height={Math.max(200, rankedCategories.length * 30)}>
            <BarChart data={rankedCategories} layout="vertical" margin={{ left: 16, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#374151' }} />
              <Tooltip contentStyle={{ border: '1px solid #9ca3af', borderRadius: 0, fontSize: 12 }} />
              <Bar dataKey="score" name="Score" fill="#111827" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function NetworkBox({
  label, n, median, p25, p75, color, maxMedian,
}: {
  label: string;
  n: number;
  median: number;
  p25: number;
  p75: number;
  color: string;
  maxMedian: number;
}) {
  const pct = maxMedian > 0 ? Math.round((median / maxMedian) * 100) : 0;
  return (
    <div className="border border-gray-200 p-4">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-2xl text-gray-900">{median}</div>
      <div className="mt-1 text-[10px] text-gray-400">
        {n} arrêts · IQR {p25}–{p75}
      </div>
      <div className="mt-3 h-1 w-full bg-gray-100">
        <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-r border-gray-300 p-5 last:border-r-0">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="truncate text-xl text-gray-900">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-gray-400">{sub}</div>}
    </div>
  );
}
