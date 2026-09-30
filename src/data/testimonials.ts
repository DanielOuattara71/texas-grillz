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
 * Contenu de démonstration : à remplacer par les avis Google réels
 * (nom, texte, date), sous réserve de l'autorisation de publication.
 */
export const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Marie L.",
    text: "Le brisket est une tuerie. Fumage parfait, viande fondante. On se croirait au Texas.",
    rating: 5,
    date: "Il y a 2 semaines",
    source: "google",
  },
  {
    id: "2",
    name: "Thomas R.",
    text: "Meilleur barbecue de Lyon, sans hésitation. Les ribs se détachent tout seuls.",
    rating: 5,
    date: "Il y a 1 mois",
    source: "google",
  },
  {
    id: "3",
    name: "Sophie M.",
    text: "Ambiance chaleureuse, service adorable. Le pecan pie est à tomber.",
    rating: 4,
    date: "Il y a 3 semaines",
    source: "google",
  },
  {
    id: "4",
    name: "Karim B.",
    text: "Commande emportée en 15 minutes, le pulled pork était encore fumant. Portion honnête.",
    rating: 5,
    date: "Il y a 5 jours",
    source: "google",
  },
  {
    id: "5",
    name: "Élodie P.",
    text: "Nous avons réservé pour 12 personnes : salle privée, musique live, équipe au petit soin.",
    rating: 5,
    date: "Mars 2026",
    source: "site",
  },
];
