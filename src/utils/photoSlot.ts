/**
 * Adresses des visuels du site.
 *
 * Deux origines cohabitent :
 *   - `/images/…`, livre avec le build statique (photos du depot) ;
 *   - `/uploads/…`, depose depuis l'espace d'administration et servi par l'API ;
 *   - `https://res.cloudinary.com/…`, images hébergées sur Cloudinary.
 */
import { asset } from "./asset";

/** Adresse à mettre dans `src`, quelle que soit la source du visuel. */
export const mediaUrl = asset;

/**
 * Emplacement photo d'un plat, derive du chemin de son illustration.
 *
 * "/images/products/ribs-o-ribs.svg" → "/images/products/ribs-o-ribs.jpg"
 *
 * Deux cas :
 *   - le champ contient une illustration `.svg` (donnees livrees) : on vise son
 *     equivalent `.jpg` dans `public/`, c'est ainsi que les vraies photos
 *     prennent le relais des dessins ;
 *   - le champ contient deja une image reelle — une photo deposee depuis
 *     l'admin (`/uploads/…` ou Cloudinary) ou un `.jpg` existant : on la renvoie telle quelle.
 */
export const photoSlot = (illustration: string): string => {
  if (!illustration) return "";
  if (/\.(jpe?g|png|webp|avif)(\?.*)?$/i.test(illustration)) return illustration;
  return illustration.replace(/\.(svg|png)$/i, ".jpg");
};
