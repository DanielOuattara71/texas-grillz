import type { AdminUser } from "./api";

/**
 * Restaurant courant de l'administration (correction D1).
 *
 * Pour un compte non privilégié (`admin`), l'identifiant est dérivé de
 * façon synchrone de `user.location_id` — jamais d'un état initialisé à
 * `null` puis corrigé par un effet, qui laisserait une fenêtre où l'écran
 * édite le contenu global.
 *
 * Pour le compte super_admin, l'identifiant vient du sélecteur manuel
 * (`selectedLocationId`). Le developer (technique) n'édite aucun contenu :
 * l'identifiant sert uniquement au filtre des écrans autorisés (lecture).
 */
export function isPrivileged(user: AdminUser | null | undefined): boolean {
  return user?.role === "super_admin";
}

export function resolveLocationId(
  user: AdminUser | null | undefined,
  selectedLocationId: string | null = null
): string | null {
  if (!user) return null;
  if (user.role === "super_admin" || user.role === "developer") {
    return selectedLocationId ?? null;
  }
  return user.location_id ?? null;
}

export function needsLocationBlocking(
  user: AdminUser | null | undefined
): boolean {
  if (!user) return false;
  const role = user.role ?? "admin";
  // Le developer n'a pas à être rattaché à un restaurant (rôle technique).
  if (role === "developer") return false;
  return !isPrivileged(user) && !(user.location_id ?? null);
}
