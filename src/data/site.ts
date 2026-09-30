import { standardSchedule } from "./hours";
import { formatHourGroups } from "../utils/availability";

export const site = {
  name: "Texas GrillZ",
  tagline: "Barbecue au feu de bois",
  established: 2017,
  address: "12 Rue de la Villette, 69003 Lyon",
  phone: "04 78 00 00 00",
  email: "contact@texasgrill.fr",
  /** Source de vérité des horaires : le statut en direct et l'affichage en découlent. */
  schedule: standardSchedule,
  /** Lignes d'horaire affichées (section Infos, pied de page), générées depuis `schedule`. */
  hours: formatHourGroups(standardSchedule),
  social: {
    instagram: "https://instagram.com/texasgrill",
    facebook: "https://facebook.com/texasgrill",
    tiktok: "https://tiktok.com/@texasgrill",
  },
  /** Note et nombre d'avis — à remplacer par les vraies valeurs Google. */
  rating: { score: 4.9, reviews: 1248, url: "https://google.com/maps" },
  /** Coupes tournantes affichées dans le rotateur du bandeau de preuve. */
  tonight: ["Brisket", "Ribs", "Pulled Pork", "Saumon fumé"],
};

/** Chiffres clés du bandeau de preuve (sous le Hero). */
export interface Proof {
  value: number;
  label: string;
  suffix?: string;
  /** Décimales affichées (4,9/5) */
  decimals?: number;
  /** Point de départ du compteur (années : évite un défilement depuis 0) */
  from?: number;
}

export const proofs: Proof[] = [
  { value: 12, suffix: " h", label: "de fumage quotidien au bois de hêtre" },
  { value: 2017, from: 1994, label: "première braise allumée à Lyon 3ᵉ" },
  { value: 4, label: "coupes fumées chaque matin, jamais réchauffées" },
  { value: 4.9, decimals: 1, suffix: "/5", label: "note moyenne sur Google" },
];

export const navLinks = [
  { label: "Concept", href: "#concept" },
  { label: "Signatures", href: "#services" },
  { label: "Carte", href: "#menu" },
  { label: "Nos Lieux", href: "#lieux" },
  { label: "Galerie", href: "#gallery" },
  { label: "Avis", href: "#avis" },
  { label: "Contact", href: "#contact" },
];
