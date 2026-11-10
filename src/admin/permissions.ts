import type { AdminUser } from "./api";

/**
 * Matrice des droits interface — doit rester alignée avec la matrice serveur
 * `server/src/permissions.js` (source de vérité par rôle).
 */
export type TabId =
  | "reservations"
  | "plats"
  | "categories"
  | "horaires"
  | "medias"
  | "restaurants"
  | "journal"
  | "visuels"
  | "avis"
  | "textes"
  | "compte";

export const TAB_META: Record<TabId, { label: string }> = {
  reservations: { label: "Réservations" },
  plats: { label: "Plats" },
  categories: { label: "Catégories" },
  horaires: { label: "Horaires" },
  medias: { label: "Mes médias" },
  restaurants: { label: "Restaurants" },
  journal: { label: "Journal" },
  visuels: { label: "Gestion des visuels" },
  avis: { label: "Avis clients" },
  textes: { label: "Textes" },
  compte: { label: "Mon compte" },
};

function tabsFor(role: string | undefined): TabId[] {
  if (role === "super_admin") {
    return [
      "reservations",
      "plats",
      "categories",
      "horaires",
      "restaurants",
      "journal",
      "visuels",
      "avis",
      "textes",
      "compte",
    ];
  }
  if (role === "developer") {
    // Rôle technique : lecture seule (réservations, journal) + Mon compte.
    return ["reservations", "journal", "compte"];
  }
  return ["reservations", "plats", "categories", "horaires", "medias", "compte"];
}

export function allowedTabs(user: AdminUser | null | undefined): TabId[] {
  if (!user) return [];
  return tabsFor(user.role);
}

export type Action =
  | "users.manage"
  | "users.reset"
  | "locations.manage"
  | "content.common"
  | "content.own"
  | "reservations.view"
  | "reservations.write"
  | "reservations.export"
  | "media.write"
  | "audit.view"
  | "password.self";

export function can(user: AdminUser | null | undefined, action: Action): boolean {
  if (!user) return false;
  const role = user.role || "admin";
  switch (action) {
    case "users.manage":
    case "users.reset":
    case "locations.manage":
      return role === "super_admin";
    case "content.common":
      return role === "super_admin";
    case "content.own":
      return role === "super_admin" || role === "admin";
    case "reservations.view":
      return true;
    case "reservations.write":
    case "reservations.export":
      return role === "super_admin" || role === "admin";
    case "media.write":
      return role === "super_admin" || role === "admin";
    case "audit.view":
      return role === "super_admin" || role === "developer";
    case "password.self":
      return true;
    default:
      return false;
  }
}
