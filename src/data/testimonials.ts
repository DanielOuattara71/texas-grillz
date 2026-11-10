export interface Testimonial {
  id: string;
  name: string;
  text: string;
  rating: number;
  date: string;
  /** Provenance de l'avis : affiche la mention « Avis Google » */
  source: "google" | "site";
}

/**
 * Avis clients affichés en carrousel.
 * Volontairement vide : ne jamais afficher de note ou d'avis factice.
 * À remplacer plus tard par la note Google officielle, avec son lien.
 */
export const testimonials: Testimonial[] = [];
