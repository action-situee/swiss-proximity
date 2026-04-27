# Notes design

## Direction

La v2 garde une interface de travail dense et sobre: barre superieure, panneau lateral, carte principale et panneau d'analyse. Le design evite les effets decoratifs afin de laisser la carte et les parametres dominer.

## Composants principaux

- Navigation haute: changement entre carte et analyse.
- Sidebar: choix Offre/Demande, H3/Polygone, categories, ponderation et diversite.
- Carte: cadre plein, controles MapLibre, selecteur de fond et legende compacte.
- Analyse: statistiques et graphiques derives de la configuration active, sans donnees simulees.

## Couleurs cartographiques

Les rampes de couleurs sont celles de v1:

- Offre: vert fonce vers jaune clair, distance faible a forte.
- Demande: quantiles verts avec ordre inverse dans la legende.

## Regles de maintenance

- Garder les controles essentiels visibles sans texte explicatif long.
- Preferer des boutons segmentes pour les modes exclusifs.
- Ne pas reintegrer de points ou statistiques aleatoires dans la carte principale.
- Isoler les futures fonctionnalites station/transport dans des composants dedies et documenter leur source de donnees avant activation.
