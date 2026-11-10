/**
 * Médias du restaurant (gérant) : bibliothèque limitée à son dossier,
 * réservée aux photos de plats et aux images de la carte.
 * Le super admin utilise « Gestion des visuels » (module fusionné).
 */
import { MediaLibrary } from "./MediaLibrary";

export function MediaScreen() {
  return <MediaLibrary scope="admin" />;
}
