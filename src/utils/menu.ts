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
export type BadgeId = NonNullable<MenuItem["badge"]>;
export type FilterId = "all" | BadgeId;

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
    id: "viandes",
    label: "Fumés au bois",
    note: "Viandes fumées lentement au bois de hêtre, accompagnements choisis à la carte.",
  },
  {
    id: "accompagnements",
    label: "Accompagnements",
    note: "Tout est fait maison, préparé le matin même.",
  },
  {
    id: "desserts",
    label: "Desserts",
    note: "Pâtisserie américaine, portions généreuses.",
  },
];

export const filters: { id: FilterId; label: string }[] = [
  { id: "all", label: "Toute la carte" },
  { id: "signature", label: "Signatures" },
  { id: "best-seller", label: "Best-sellers" },
  { id: "nouveau", label: "Nouveautés" },
];

/** Plats d'une categorie. */
export const itemsOf = (
  id: CategoryId,
  items: MenuItem[] = deliveredMenu
): MenuItem[] => items.filter((item) => item.category === id);

export const applyFilter = (items: MenuItem[], filter: FilterId): MenuItem[] =>
  filter === "all" ? items : items.filter((item) => item.badge === filter);

/** Fourchette de prix lisible d'une catégorie, ex. "5,00 € – 24,00 €". */
export const priceSpan = (items: MenuItem[]): string => {
  if (items.length === 0) return "—";
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

/** Classement des plats les plus commandes (bloc « Top 5 » sous la carte). */
export const topOrdered = (
  limit = 5,
  items: MenuItem[] = deliveredMenu
): MenuItem[] =>
  [...items].sort((a, b) => b.orders - a.orders).slice(0, limit);
