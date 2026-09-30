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
    id: "brisket",
    kicker: "Tranché à la commande",
    hook: "Douze heures de hêtre, une croûte de poivre noir et le cœur encore rosé sous la cerne fumée.",
    stamp: "12 h de feu",
    video: smokyReel,
    featured: true,
    item: byId("brisket"),
  },
  {
    id: "ribs",
    kicker: "Laqué à la sortie du feu",
    hook: "Miel et bourbon en deux couches : ça brille, ça colle aux doigts, la viande lâche l'os.",
    stamp: "Best-seller",
    item: byId("ribs"),
  },
  {
    id: "mac-cheese",
    kicker: "Préparé le matin même",
    hook: "Cheddar affiné, chapelure dorée au four, la cuillère qui tire le fil.",
    item: byId("mac-cheese"),
  },
  {
    id: "chicken",
    kicker: "Mariné vingt-quatre heures",
    hook: "Demi-poulet fermier laqué au sirop d'érable, la peau croustille sous le couteau.",
    item: byId("chicken"),
  },
  {
    id: "cornbread",
    kicker: "Du four à la table",
    hook: "Tiède, beurre fondu, filet de miel : prévu pour deux, jamais fini à deux.",
    stamp: "Nouveau",
    item: byId("cornbread"),
  },
  {
    id: "pecan-pie",
    kicker: "Pour ne pas s'arrêter",
    hook: "Noix de pécan caramélisées, crème fouettée à peine sucrée.",
    item: byId("pecan-pie"),
  },
];
