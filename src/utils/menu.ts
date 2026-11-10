/**
 * Utilitaires de la carte.
 *
 * Toutes les fonctions prennent la carte en parametre et tombent sur les
 * donnees livrees par defaut. C'est ce qui permet au site de fonctionner avec
 * la carte issue de l'API (modifiable depuis l'admin) tout en gardant le
 * fonctionnement hors ligne : aucun calcul n'est fige au chargement.
 */
import { menuItems as deliveredMenu, type MenuItem } from "../data/menu";
import { formatPrice } from "./formatPrice";

export type CategoryId = MenuItem["category"];
export type FilterId = "all";

export interface CategoryMeta {
  id: CategoryId;
  /** Titre de la ligne d'index */
  label: string;
  /** Sous-texte affiché dans la ligne dépliée */
  note: string;
}

/** Ordre d'affichage de la carte (index numéroté, comme sur une carte papier). */
export const categories: CategoryMeta[] = [
  {
    id: "mix-grill",
    label: "Mix Grill",
    note: "Plateaux de viandes grillées à partager.",
  },
  {
    id: "saisonniers",
    label: "Saisonniers",
    note: "Suggestions du moment.",
  },
  {
    id: "bbq",
    label: "Viande BBQ",
    note: "Poulet texan, côtes de porc, steak et ribs, sauce secrète de la maison.",
  },
  {
    id: "burgers",
    label: "Burgers",
    note: "Les burgers maison.",
  },
  {
    id: "brochettes",
    label: "Brochettes",
    note: "Brochettes grillées, servies sans accompagnement.",
  },
  {
    id: "garnitures",
    label: "Garnitures",
    note: "Accompagnements à ajouter à votre plat.",
  },
  {
    // TODO(client): jours exacts et validité
    id: "weekend",
    label: "Week-end Carnivore",
    note: "Menu du week-end. Accompagnement de base : attiéké.",
  },
  {
    id: "boissons",
    label: "Boissons",
    note: "Softs, bières, jus, liqueurs et vins.",
  },
];

export const filters: { id: FilterId; label: string }[] = [
  { id: "all", label: "Toute la carte" },
];

/** Un plat est-il servi dans ce restaurant ? (`locationIds`/`locationId`) */
export const isServedAt = (item: MenuItem, locationId: string): boolean => {
  if (item.locationId) return item.locationId === locationId;
  if (!item.locationIds || item.locationIds.length === 0) return true;
  return item.locationIds.includes(locationId);
};

/** Plats associés à un restaurant (provenance via restoID). */
export const dishesForLocation = (
  locationId: string,
  items: MenuItem[] = deliveredMenu
): MenuItem[] => items.filter((item) => isServedAt(item, locationId));

/** Plats d'une categorie. */
export const itemsOf = (
  id: CategoryId,
  items: MenuItem[] = deliveredMenu
): MenuItem[] => items.filter((item) => item.category === id);

export const applyFilter = (items: MenuItem[], _filter: FilterId): MenuItem[] => items;

/** Fourchette de prix lisible d'une catégorie, ex. "1 000 FCFA – 65 000 FCFA". */
export const priceSpan = (items: MenuItem[]): string => {
  if (items.length === 0) return "";
  const prices = items.map((item) => item.price);
  const min = formatPrice(Math.min(...prices));
  const max = formatPrice(Math.max(...prices));
  return min === max ? min : `${min} – ${max}`;
};

/**
 * Nombre total de plats, affiche dans le titre de section. Prend la carte en
 * parametre : compte les plats reellement affiches, pas ceux du fichier.
 */
export const totalDishes = (items: MenuItem[] = deliveredMenu): number =>
  items.length;
