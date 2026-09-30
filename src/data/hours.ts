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

/**
 * Horaires de la maison : service du midi le dimanche, fermé le lundi,
 * service du soir du mardi au samedi (23h00 du mardi au jeudi,
 * minuit passante le vendredi et le samedi).
 */
export const standardSchedule: DayService[] = [
  { open: "12:00", close: "15:00" }, // dimanche
  { open: null, close: null }, // lundi
  { open: "18:30", close: "23:00" }, // mardi
  { open: "18:30", close: "23:00" }, // mercredi
  { open: "18:30", close: "23:00" }, // jeudi
  { open: "18:30", close: "24:00" }, // vendredi
  { open: "18:30", close: "24:00" }, // samedi
];

/** Adresse à service prolongé : fermeture à minuit passante du mardi au samedi (Lyon 7ᵉ). */
export const lateSchedule: DayService[] = [
  { open: "12:00", close: "15:00" }, // dimanche
  { open: null, close: null }, // lundi
  { open: "18:30", close: "24:00" }, // mardi
  { open: "18:30", close: "24:00" }, // mercredi
  { open: "18:30", close: "24:00" }, // jeudi
  { open: "18:30", close: "24:00" }, // vendredi
  { open: "18:30", close: "24:00" }, // samedi
];
