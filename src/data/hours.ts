/**
 * Horaires de service — source de vérité unique du statut d'ouverture.
 * Format 24 h "HH:MM" ; "24:00" désigne minuit en fin de soirée (service qui
 * démarre un soir et s'arrête à minuit passante).
 */
export interface DayService {
  /** Heure d'ouverture, `null` si l'établissement ne sert pas ce jour. */
  open: string | null;
  /** Heure de fermeture, `null` si fermé. */
  close: string | null;
}

/** Index 0 = dimanche, dans l'ordre de `Date.prototype.getDay()`. */
export const dayNames = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;

// TODO(client): horaires du week-end à confirmer
/**
 * Horaires provisoires — Abidjan (un seul tableau pour toutes les adresses).
 * Lundi → jeudi : 12h00–23h30 (Go Africa). Vendredi → dimanche : 12h00–24h00
 * (provisoire, à confirmer).
 */
export const standardSchedule: DayService[] = [
  { open: "12:00", close: "24:00" }, // dimanche
  { open: "12:00", close: "23:30" }, // lundi
  { open: "12:00", close: "23:30" }, // mardi
  { open: "12:00", close: "23:30" }, // mercredi
  { open: "12:00", close: "23:30" }, // jeudi
  { open: "12:00", close: "24:00" }, // vendredi
  { open: "12:00", close: "24:00" }, // samedi
];
