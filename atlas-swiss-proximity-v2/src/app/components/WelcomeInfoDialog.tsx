import { X } from 'lucide-react';

interface WelcomeInfoDialogProps {
  open: boolean;
  onClose: () => void;
}

export function WelcomeInfoDialog({ open, onClose }: WelcomeInfoDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
      <div className="max-h-[86vh] w-full max-w-3xl overflow-auto border border-gray-400 bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-300 bg-white px-6 py-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Mode d'emploi</div>
            <h2 className="text-lg text-gray-900">Bienvenue sur Swiss Proximity</h2>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center border border-gray-300 hover:bg-gray-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5 text-sm leading-6 text-gray-700">
          <section>
            <p>
              Swiss Proximity est un outil de planification et d'aide à la décision pour penser les territoires urbains
              depuis les proximités: services, diversité d'offre, accessibilité quotidienne et hospitalité urbaine.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-sm uppercase tracking-wider text-gray-900">Les proximités urbaines</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>densité: disposer de services et lieux utiles à courte distance;</li>
              <li>diversité: proposer plusieurs types de lieux et plusieurs choix proches;</li>
              <li>nature et convivialité: intégrer les qualités urbaines qui rendent la proximité désirable.</li>
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-sm uppercase tracking-wider text-gray-900">Utiliser l'interface</h3>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Choisissez les catégories dans la colonne de gauche.</li>
              <li>Ajustez la pondération pour dire ce qui compte le plus dans votre définition de la proximité.</li>
              <li>Ajustez la diversité pour demander un ou plusieurs lieux proches par catégorie.</li>
              <li>Activez les couches de contexte SITG pour lire la proximité avec le vélo, les TP, le rail ou la canopée.</li>
              <li>Survolez la carte: le popup affiche les catégories sélectionnées uniquement.</li>
            </ol>
          </section>

          <section>
            <h3 className="mb-2 text-sm uppercase tracking-wider text-gray-900">Formule simplifiée</h3>
            <p>
              La carte combine les distances aux catégories sélectionnées en tenant compte de leur poids et de leur niveau
              de diversité. Une catégorie avec une diversité élevée cherche plusieurs lieux proches; une pondération forte
              lui donne plus d'influence dans le rendu.
            </p>
          </section>

          <section className="border-t border-gray-200 pt-4 text-xs text-gray-500">
            <p>
              Données de proximité: EPFL LASUR / ENAC IT4R. Données contextuelles: SITG. Les données OSM et open data
              peuvent contenir des erreurs ou omissions et doivent être vérifiées pour un usage opérationnel.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
