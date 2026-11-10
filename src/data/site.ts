import { standardSchedule } from "./hours";
import { formatHourGroups } from "../utils/availability";
import { locations } from "./locations";

export const site = {
  name: "Texas GrillZ",
  tagline: "Grillades et burgers à l'américaine, Abidjan",
  established: 2017,
  address: "Rue Lumière, en face du Cours Sévigné, Zone 4 C, Marcory, Abidjan",
  phone: "07 77 59 59 47",
  // TODO(client): variants vues en ligne non retenues : 07 07 03 09 09 / 07 03 09 09 09
  email: "texas.grillz15@gmail.com",
  // TODO(client): confirmer lequel afficher (texasgrillz@hotmail.com vu sur un annuaire)
  /** Source de vérité des horaires : le statut en direct et l'affichage en découlent. */
  schedule: standardSchedule,
  /** Lignes d'horaire affichées (section Infos, pied de page), générées depuis `schedule`. */
  hours: formatHourGroups(standardSchedule),
  social: {
    facebook: "https://www.facebook.com/p/Texas-GrillZ-100068946285002/",
    tiktok: "https://www.tiktok.com/@texasgrillz",
    // TODO(client): URL Instagram et X inconnues (icônes présentes sur les menus)
  },
  /**
   * Note Google officielle, avec son lien.
   * Volontairement absent : ne jamais afficher de note factice.
   * À remplacer plus tard par la note Google officielle, avec son lien.
   */
  rating: undefined as { score: number; reviews: number; url: string } | undefined,
  /** Coupes tournantes affichées dans le rotateur du bandeau de preuve. */
  tonight: ["Ribs Ô Ribs", "Poulet texan", "Mix Grill", "Juicy Maxwell"],
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
  { value: 2017, from: 2005, label: "Texas GrillZ ouvre ses premières braises" },
  { value: locations.length, label: "adresses à Abidjan" },
];

export const navLinks = [
  { label: "Concept", href: "#concept" },
  { label: "Signatures", href: "#services" },
  { label: "Carte", href: "#menu" },
  { label: "Nos Lieux", href: "#lieux" },
  { label: "Galerie", href: "#gallery" },
  { label: "Contact", href: "#contact" },
];
