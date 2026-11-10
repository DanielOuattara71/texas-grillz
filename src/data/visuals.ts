import { asset } from "../utils/asset";
/**
 * Emplacements visuels fixes du site, hors plats et adresses.
 *
 * Ces visuels ne sont pas des listes : ce sont des emplacements uniques (le
 * hero, le logo, une photo de la page Histoire) ou une grille (la galerie).
 * Ils sont declares ici plutot qu'ecrits en dur dans les composants, afin que
 * l'admin puisse les changer comme le reste du contenu.
 *
 * `type` distingue une image d'une boucle video : la galerie melange les deux,
 * le hero n'accepte qu'un visuel de braise. `ratio` ne concerne que la
 * galerie, ou la grille alterne les grandes cases.
 */
export interface Visual {
  /** Identifiant technique, sert de clé de stockage. */
  id: string;
  /** Ce que voit le visiteur, affiché dans l'admin. */
  label: string;
  /** "image" : photo. "video" : boucle (galerie uniquement). */
  type: "image" | "video";
  /** URL du visuel : `/uploads/…`, asset(`images/…`) ou `https://…`. */
  src: string;
  /** Texte alternatif (accessibilité) : décrit la photo, obligatoire. */
  alt: string;
  /** Galerie uniquement : `row-span-2` pour une grande case. */
  ratio?: string;
}

/**
 * Emplacements uniques. Chacun est modifiable dans l'admin, mais on ne peut ni
 * les supprimer ni en ajouter : le code attend qu'ils existent.
 */
export const fixedVisuals: Visual[] = [
  {
    id: "logo",
    label: "Logo (barre de navigation, pied de page, écran de chargement)",
    type: "image",
    src: asset("logo.jpg"),
    alt: "Logo Texas GrillZ",
  },
  {
    id: "hero",
    label: "Hero, visuel de braise en haut de la page d'accueil",
    type: "image",
    // Vide : le hero joue alors la boucle video de repli (voir Hero.tsx).
    // Renseignez une photo ici pour la remplacer.
    src: "",
    alt: "Viandes en train de fumer au-dessus des braises",
  },
  {
    id: "concept",
    label: "Concept : le smoker, section « Fumé, jamais pressé »",
    type: "image",
    src: "",
    alt: "Le smoker, au petit matin",
  },
  {
    id: "histoire",
    label: "Page Histoire, premier chapitre",
    type: "image",
    src: asset("images/histoire.jpg"),
    alt: "Planches fumées servies chez Texas GrillZ",
  },
  {
    id: "histoire-evolution",
    label: "Page Histoire, chapitre « L'évolution »",
    type: "image",
    src: asset("images/locations/zone-4.jpg"),
    alt: "Espace service de Texas GrillZ à Marcory Zone 4, Abidjan",
  },
  {
    id: "fondateur",
    label: "Page Histoire, le fondateur",
    type: "image",
    src: asset("logo.jpg"),
    alt: "Portrait du fondateur Texas GrillZ",
  },
];

/** Galerie : une liste ordonnee, melangeant photos et boucles. */
export const galleryVisuals: Visual[] = [
  {
    id: "g1",
    label: "Galerie 1",
    type: "image",
    src: asset("images/gallery/1.jpg"),
    alt: "Grande planche de grillades gravée Texas Grillz",
    ratio: "row-span-2",
  },
  {
    id: "g2",
    label: "Galerie 2",
    type: "image",
    src: asset("images/gallery/2.jpg"),
    alt: "Viandes fumées, frites et crudités sur planche",
  },
  {
    id: "g3",
    label: "Galerie 3",
    type: "image",
    src: asset("images/gallery/3.jpg"),
    alt: "Planche à partager : riz, plantain et brochettes",
  },
  {
    id: "g4",
    label: "Galerie 4",
    type: "image",
    src: asset("images/gallery/4.jpg"),
    alt: "Brochettes de gambas grillées",
  },
  {
    id: "g5",
    label: "Galerie 5",
    type: "image",
    src: asset("images/gallery/5.jpg"),
    alt: "Assortiment de brochettes, poulet et frites",
  },
  {
    id: "g6",
    label: "Galerie 6",
    type: "image",
    src: asset("images/gallery/6.jpg"),
    alt: "Planche qui sort de la cuisine",
  },
  {
    id: "g7",
    label: "Galerie 7",
    type: "image",
    src: asset("images/gallery/7.jpg"),
    alt: "Purée maison en bol, crudités et sauce",
  },
];
