/**
 * Adresse d'un asset statique livré avec le site (images, vidéos, logo…).
 *
 * En développement comme sur GitHub Pages, le site est servi sous un
 * sous-dossier (« /texas-grillz/ »). Un chemin absolu sans base (`/images/…`)
 * pointerait alors chez la racine du domaine, hors de ce dossier — l'image
 * part en 404 et la section entière s'affiche vide. `asset()` préfixe le
 * chemin avec la base Vite (« /texas-grillz/ »).
 *
 * La fonction est idempotente : un chemin déjà préfixé est renvoyé tel quel.
 * Les médias déposés/collectés par le backend restent servis par le domaine
 * de l'API (/uploads/…, Cloudinary).
 */
import { API_BASE } from "../admin/config";

export const asset = (path: string): string => {
  if (!path) return "";
  // URLs complètes (site, CDN, data URI) : inchangées.
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  const clean = path.replace(/^\/+/, "");
  const base = import.meta.env.BASE_URL; // ex. « /texas-grillz/ »
  const baseClean = base.replace(/^\/+|\/+$/g, "");
  // Chemin déjà préfixé : on ne préfixe jamais deux fois.
  if (baseClean && (clean === baseClean || clean.startsWith(`${baseClean}/`))) {
    return base + clean.slice(baseClean.length + 1);
  }
  // Médias servis par le back-office : domaine de l'API ou Cloudinary.
  if (clean.startsWith("uploads/") || /^res\.cloudinary\.com\//.test(clean)) {
    return API_BASE + clean;
  }
  return `${base}${clean}`;
};
