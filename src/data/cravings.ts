import { menuItems, type MenuItem } from "./menu";

/**
 * La grille d'« envies » : ce qu'on regarde en premier quand on a faim.
 * Une entrée = un plat de la carte (le prix et le nom viennent de `menu.ts`,
 * impossible donc qu'ils divergent) + une phrase d'accroche qui se voit.
 *
 * Photo : dès qu'un JPEG est déposé dans `public/images/products/<id>.jpg`,
 * le visuel apparaît (détection automatique, voir `ui/FoodMedia.tsx`).
 */
const byId = (id: string): MenuItem => {
  const item = menuItems.find((entry) => entry.id === id);
  if (!item) throw new Error(`Plat introuvable dans la carte : ${id}`);
  return item;
};

/** Boucle de braise utilisée par la tuile vedette (5 Mo, desktop uniquement). */
export const smokyReel =
  "/videos/Barbecue_grilling_meat_over_coals_20260927120421.mp4";

export interface Craving {
  id: string;
  /** Petite ligne au-dessus du nom : le geste, pas la catégorie. */
  kicker: string;
  /** Accroche sensorielle, une seule idée, visible tout de suite. */
  hook: string;
  /** Tampon d'encre posé sur le visuel (« 12 h de feu », « Nouveau »). */
  stamp?: string;
  /** Boucle vidéo (tuile vedette). */
  video?: string;
  /** Tuile large, visible dès le chargement. */
  featured?: boolean;
  item: MenuItem;
}

export const cravings: Craving[] = [
  {
    id: "ribs-o-ribs",
    kicker: "Du grill à la table",
    hook: "Des travers de porc assaisonnés à la sauce secrète, tendres et juteux.",
    stamp: "Ribs Ô Ribs",
    video: smokyReel,
    featured: true,
    item: byId("ribs-o-ribs"),
  },
  {
    id: "juicy-maxwell",
    kicker: "Cœur fondant",
    hook: "Un steak, un cœur fondant de fromage : le Juicy Maxwell, simple ou double.",
    stamp: "Cœur fondant",
    item: byId("juicy-maxwell"),
  },
  {
    id: "mix-boeuf-poulet-porc",
    kicker: "À partager",
    hook: "Bœuf, poulet et porc grillés sur un seul plateau.",
    stamp: "À partager",
    item: byId("mix-boeuf-poulet-porc"),
  },
  {
    id: "poulet-texan-entier",
    kicker: "Façon texane",
    hook: "Le poulet texan, en demi ou en entier.",
    item: byId("poulet-texan-entier"),
  },
  {
    id: "grand-canyon",
    kicker: "Le grand format",
    hook: "Le Grand Canyon : pour les très grosses faims.",
    item: byId("grand-canyon"),
  },
  {
    id: "steak-filet-boeuf",
    kicker: "Au feu",
    hook: "Un steak de filet de bœuf grillé.",
    item: byId("steak-filet-boeuf"),
  },
];
