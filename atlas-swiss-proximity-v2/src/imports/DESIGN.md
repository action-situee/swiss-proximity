# Design System - Portail Cyclabilité Grand Genève

## Principes de design

Le portail suit une approche **sobre, institutionnelle et cartographique** :
- Fond clair et neutre pour faciliter la lecture
- Contraste élevé pour l'accessibilité
- Pas de style trop marketing ou gadget
- Mobile-first pour le formulaire terrain
- Densité d'information élevée mais confortable

## Palette de couleurs

### Couleurs primaires

- **Bleu principal** : `#3b82f6` - Actions principales, liens, éléments interactifs
- **Vert secondaire** : `#10b981` - Validations, succès, points positifs

### Couleurs sémantiques

#### Classes d'indice de cyclabilité
- **Très faible** : `#dc2626` (rouge)
- **Faible** : `#ea580c` (orange)
- **Moyen** : `#eab308` (jaune)
- **Bon** : `#84cc16` (vert-jaune)
- **Très bon** : `#22c55e` (vert)

#### États et alertes
- **Danger / Alerte** : `#dc2626`
- **Avertissement** : `#eab308`
- **Information** : `#3b82f6`
- **Succès** : `#10b981`

### Couleurs neutres

- **Fond principal** : `#ffffff`
- **Fond secondaire** : `#f8f9fa`
- **Fond tertiaire** : `#f3f3f5`
- **Bordures** : `rgba(0, 0, 0, 0.1)`
- **Texte principal** : `#1f2937`
- **Texte secondaire** : `#6b7280`

## Typographie

### Police
- **Famille** : System font stack (sans-serif)
- **Poids** : 
  - Normal : 400
  - Medium : 500 (titres, labels, boutons)

### Échelle typographique
- **H1** : 1.5rem (24px) - Titres de pages
- **H2** : 1.25rem (20px) - Sous-titres de sections
- **H3** : 1.125rem (18px) - Titres de composants
- **Body** : 1rem (16px) - Texte courant
- **Small** : 0.875rem (14px) - Texte secondaire
- **Tiny** : 0.75rem (12px) - Métadonnées

## Composants

### Boutons

#### Variantes
- **Primary** : Fond bleu, texte blanc - Actions principales
- **Secondary** : Fond vert, texte blanc - Actions secondaires positives
- **Outline** : Bordure grise, fond transparent - Actions neutres
- **Ghost** : Pas de bordure, fond transparent au hover - Actions tertiaires

#### Tailles
- **Small** : 1.5rem padding vertical, texte 0.875rem
- **Medium** : 2rem padding vertical, texte 1rem (défaut)
- **Large** : 3rem padding vertical, texte 1.125rem

### Badges

#### Variantes
- **Default** : Gris neutre
- **Success** : Vert clair
- **Warning** : Jaune clair
- **Danger** : Rouge clair
- **Info** : Bleu clair

### Marqueurs de carte

- **Forme** : Cercles avec bordure blanche
- **Taille normale** : 32px
- **Taille sélectionnée** : 40px
- **Couleur** : Selon la classe d'indice
- **Ombre** : `0 2px 8px rgba(0,0,0,0.2)`

### Scores et notes

- **Affichage** : Séries de cercles (5 maximum)
- **Cercle actif** : Bleu primaire
- **Cercle inactif** : Gris clair
- **Option N/A** : Toujours disponible

### Cartes et panneaux

- **Fond** : Blanc
- **Bordure** : 1px gris clair
- **Rayon de bordure** : 0.5rem (8px)
- **Padding** : 1rem (16px) à 1.5rem (24px)

## Mise en page

### Grille

- **Breakpoints** :
  - Mobile : < 640px
  - Tablet : 640px - 1024px
  - Desktop : > 1024px

### Espacements

- **XS** : 0.25rem (4px)
- **SM** : 0.5rem (8px)
- **MD** : 1rem (16px)
- **LG** : 1.5rem (24px)
- **XL** : 2rem (32px)
- **2XL** : 3rem (48px)

### Panneaux latéraux

- **Panneau gauche (filtres)** : 320px (80 unités)
- **Panneau droit (détails)** : 384px (96 unités)
- **Mobile** : Plein écran avec overlay

## Icônes

- **Bibliothèque** : Lucide React
- **Style** : Lignes fines, simples
- **Tailles courantes** :
  - Petit : 16px (w-4 h-4)
  - Moyen : 20px (w-5 h-5)
  - Grand : 24px (w-6 h-6)

### Icônes principales
- `MapPin` : Localisation, cibles
- `Filter` : Filtres
- `AlertCircle` : Alertes, divergences
- `Zap` : Quick wins
- `BarChart3` : Synthèse, statistiques
- `Camera` : Photos, galerie
- `User` : Utilisateur, association
- `Calendar` : Dates

## États interactifs

### Hover
- **Boutons** : Assombrir légèrement la couleur de fond
- **Liens** : Souligner
- **Cartes** : Ombre plus prononcée

### Focus
- **Inputs** : Bordure bleue
- **Boutons** : Ring bleu

### Disabled
- **Opacité** : 50%
- **Curseur** : not-allowed

## Responsive

### Mobile-first
- Formulaires optimisés pour saisie tactile
- Champs espacés pour faciliter la saisie
- Boutons suffisamment grands (min 44px)

### Tablet
- Grilles en 2 colonnes
- Navigation en haut

### Desktop
- Grilles en 3-4 colonnes
- Panneaux latéraux fixes
- Carte plein écran au centre

## Accessibilité

- **Contraste** : WCAG AA minimum (4.5:1 pour le texte normal)
- **Focus visible** : Ring bleu sur tous les éléments interactifs
- **Labels** : Tous les inputs ont des labels explicites
- **ARIA** : Attributs aria-label pour les icônes seules
- **Taille de police** : Minimum 14px pour le corps de texte

## Animation

- **Transitions** : 200ms pour les états de hover
- **Animation de carte** : 500ms pour le centrage
- **Modales** : Fade in/out

## Formulaires

### Champs de saisie

- **Hauteur** : 2.5rem (40px)
- **Padding** : 0.75rem horizontal
- **Bordure** : 1px gris
- **Rayon** : 0.5rem
- **Focus** : Bordure bleue

### Checkbox et radio

- **Taille** : 1rem (16px)
- **Rayon checkbox** : 0.25rem
- **Rayon radio** : Cercle complet

### Select

- **Style natif** : Oui (pas de custom dropdown complexe)
- **Icône** : Chevron natif du navigateur

## Cartes (maps)

### Tuiles
- **Provider** : OpenStreetMap
- **Style** : Standard
- **Fond** : Gris très clair (#f8f9fa)

### Controls
- **Zoom** : En haut à gauche
- **Attribution** : En bas à droite
- **Couleur** : Gris foncé

## Impression

- Prévoir des styles d'impression pour :
  - Vue synthèse
  - Fiches de cibles
  - Rapports de retours

---

**Version** : 1.0.0  
**Dernière mise à jour** : Mars 2026
