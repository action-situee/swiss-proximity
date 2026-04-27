import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  listTilesParams,
  selectedTileName,
  type DemandVariable,
  type MapMode,
  type ProximityCategory,
  type TilingType,
} from '../lib/proximityData';

interface AnalysisPanelProps {
  categories: ProximityCategory[];
  demandModes: DemandVariable[];
  mapMode: MapMode;
  tilingType: TilingType;
  distance: number;
  year: number;
  dataMode: 'proximity' | 'mobility';
  timeMode: 'day' | 'night' | '24h';
}

const colorScale = ['#111827', '#dc2626', '#6b7280', '#2563eb', '#16a34a', '#9333ea'];

export function AnalysisPanel({
  categories,
  demandModes,
  mapMode,
  tilingType,
  distance,
  year,
  timeMode,
}: AnalysisPanelProps) {
  const sidebarCategories = categories.filter(category => category.id !== 'All');
  const activeCategories = sidebarCategories.filter(category => category.enabled && category.weight > 0);
  const activeDemandModes = demandModes.filter(mode => mode.enabled);
  const tileName = selectedTileName(mapMode, tilingType);
  const tile = listTilesParams.find(item => item.name === tileName);

  const rankedCategories = [...activeCategories]
    .map(category => ({
      id: category.id,
      name: category.name,
      ponderation: Math.round(category.weight * 100),
      diversite: category.diversity,
      score: Math.round(category.weight * category.diversity * 100),
      infos: category.infos,
    }))
    .sort((a, b) => b.score - a.score);

  const leadingCategory = rankedCategories[0];
  const broadCategories = rankedCategories.filter(category => category.diversite >= 4);
  const focusedCategories = rankedCategories.filter(category => category.diversite <= 2);
  const averageWeight = rankedCategories.length
    ? Math.round(rankedCategories.reduce((sum, category) => sum + category.ponderation, 0) / rankedCategories.length)
    : 0;
  const averageDiversity = rankedCategories.length
    ? (rankedCategories.reduce((sum, category) => sum + category.diversite, 0) / rankedCategories.length).toFixed(1)
    : '0.0';

  return (
    <div className="h-full overflow-auto bg-white">
      <div className="border-b border-gray-300 px-8 py-6">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-500">
          Lecture analytique · {timeMode === '24h' ? '24h' : timeMode === 'day' ? 'Jour' : 'Nuit'}
        </div>
        <h2 className="text-xl text-gray-900">Ce que raconte la carte de proximité</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-600">
          Cette analyse interprète la configuration active de la carte. Elle ne remplace pas encore un calcul statistique
          agrégé sur toutes les tuiles, mais elle met en évidence les arbitrages que vous êtes en train de donner au
          modèle: quels services comptent, avec quelle intensité, et quel niveau de diversité est attendu autour des lieux.
        </p>
      </div>

      <div className="grid grid-cols-4 border-b border-gray-300">
        <Stat label="Catégories retenues" value={String(rankedCategories.length)} />
        <Stat label="Pondération moyenne" value={`${averageWeight}%`} />
        <Stat label="Diversité moyenne" value={averageDiversity} />
        <Stat label="Maille active" value={tilingType === 'h3' ? 'H3' : 'Secteur'} />
      </div>

      <div className="grid gap-6 p-8 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="border border-gray-300 p-6">
          <h3 className="mb-3 text-sm uppercase tracking-wider text-gray-900">Profil de scénario</h3>
          <div className="space-y-4 text-sm leading-6 text-gray-700">
            <p>
              La carte est actuellement lue comme une carte d’<strong>{mapMode === 'supply' ? 'offre de proximité' : 'demande de proximité'}</strong>.
              Le rendu privilégie {leadingCategory ? <strong>{leadingCategory.name}</strong> : 'les catégories sélectionnées'} et utilise la source
              <span className="font-medium"> {tileName.replaceAll('_', ' ')}</span>.
            </p>
            <p>
              Un score élevé combine deux choix: une pondération forte et une exigence de diversité importante. Il signale
              les catégories qui structurent le plus la lecture de la carte, pas nécessairement les territoires déjà les mieux dotés.
            </p>
            <p>
              Pour la suite, ce panneau pourra recevoir des statistiques calculées directement sur les tuiles: surface couverte
              par classe, distribution des distances, et comparaison entre agglomérations.
            </p>
          </div>
        </section>

        <section className="border border-gray-300 p-6">
          <h3 className="mb-3 text-sm uppercase tracking-wider text-gray-900">Points à surveiller</h3>
          <div className="space-y-3 text-sm leading-6 text-gray-700">
            <Insight
              title="Catégories larges"
              value={broadCategories.length ? broadCategories.map(category => category.name).join(', ') : 'Aucune'}
              description="Une diversité élevée demande plusieurs lieux proches, ce qui favorise les centralités mixtes."
            />
            <Insight
              title="Catégories ciblées"
              value={focusedCategories.length ? focusedCategories.map(category => category.name).join(', ') : 'Aucune'}
              description="Une diversité faible accepte une présence plus ponctuelle, utile pour lire les services rares."
            />
            <Insight
              title="Demande désactivée"
              value={`${distance} m · ${year}`}
              description="Le volet demande reste prêt dans le modèle, mais le bouton est volontairement verrouillé dans l'interface."
            />
          </div>
        </section>

        <section className="border border-gray-300 p-6 xl:col-span-2">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-sm uppercase tracking-wider text-gray-900">Catégories structurantes</h3>
              <p className="mt-1 text-xs text-gray-500">Score = pondération × diversité. Les valeurs viennent de la sidebar.</p>
            </div>
            <div className="text-right text-[10px] uppercase tracking-wider text-gray-500">
              {activeDemandModes.map(mode => mode.name).join(', ')}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={rankedCategories} layout="vertical" margin={{ left: 24, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: '#374151' }} />
              <Tooltip contentStyle={{ border: '1px solid #9ca3af', borderRadius: 0, fontSize: 12 }} />
              <Bar dataKey="score" name="Score">
                {rankedCategories.map((entry, index) => (
                  <Cell key={entry.id} fill={colorScale[index % colorScale.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="border border-gray-300 p-6 xl:col-span-2">
          <h3 className="mb-3 text-sm uppercase tracking-wider text-gray-900">Méthode et source</h3>
          <div className="grid gap-4 text-sm leading-6 text-gray-700 md:grid-cols-2">
            <p>
              Les tuiles PMTiles v1 restent la source de vérité cartographique. La couche active est colorée dans MapLibre
              par une expression qui lit les champs de distance de chaque catégorie.
            </p>
            <p>
              Source chargée: <span className="break-all font-medium text-gray-900">{tile?.url}</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-gray-300 p-5 last:border-r-0">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="truncate text-xl text-gray-900">{value}</div>
    </div>
  );
}

function Insight({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="border-b border-gray-200 pb-3 last:border-b-0">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{title}</div>
      <div className="mt-1 font-medium text-gray-900">{value}</div>
      <div className="mt-1 text-xs leading-5 text-gray-500">{description}</div>
    </div>
  );
}
