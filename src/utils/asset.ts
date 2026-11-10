/**
 * Adresse d'un asset statique livré avec le site (images, vidéos, logo…).
 *
 * En développement comme sur GitHub Pages, le site est servi sous un
 * sous-dossier (« /texas-grillz/ »). Un chemin absolu (`/images/…`)
 * pointerait alors chez la racine du domaine, hors de ce dossier — l'image
 * part en 404 et la section entière s'affiche vide. `asset()` préfixe le
 * chemin avec la base Vite (« /texas-grillz/ »). Les médias servis par
 * l'API (`/uploads/…`, Cloudinary) restent hors base : ils sont servis par
 * le domaine de l'API.
 */
import { API_BASE } from "../admin/config";

export const asset = (path: string): string => {
  if (!path) return "";
  // URLs complètes (site, CDN, data URI) : inchangées.
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  const clean = path.replace(/^\/+/, "");
  // Médias déposés/collectés par le backend : domaine de l'API ou Cloudinary.
  if (clean.startsWith("uploads/") || /^res\.cloudinary\.com\//.test(clean)) {
    return API_BASE + clean;
  }
  return `${import.meta.env.BASE_URL}${clean}`;
};
