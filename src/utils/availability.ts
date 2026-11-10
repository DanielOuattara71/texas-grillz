import { dayNames, type DayService } from "../data/hours";

/** Minutes depuis minuit à partir d'un horaire "HH:MM" ("24:00" → 1440). */
export const toMinutes = (hhmm: string): number => {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
};

/** Minutes → horaire à la française : 1380 → "23h00", 1440 → "00h00". */
export const frenchHour = (minutes: number): string => {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = Math.round(minutes % 60);
  return `${String(hours).padStart(2, "0")}h${String(mins).padStart(2, "0")}`;
};

export type AvailabilityTone = "open" | "closing" | "closed";

export interface Availability {
  tone: AvailabilityTone;
  label: string;
  detail: string;
}

/** Derrière cette fenêtre (en minutes) avant la fermeture, on parle de « dernières tables ». */
const CLOSING_WINDOW = 60;

/**
 * Prochain créneau depuis `day`/`minutes` : "à 18h30" (aujourd'hui)
 * ou "vendredi 18h30". Le parcours s'arrête au bout d'une semaine complète.
 */
function nextService(
  schedule: DayService[],
  day: number,
  minutes: number
): string {
  for (let step = 0; step <= 7; step += 1) {
    const index = (day + step) % 7;
    const service = schedule[index];
    if (!service.open) continue;
    const opening = toMinutes(service.open);
    if (step === 0 && opening <= minutes) continue;
    return step === 0
      ? `à ${frenchHour(opening)}`
      : `${dayNames[index].toLowerCase()} ${frenchHour(opening)}`;
  }
  return "";
}

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Jour et heure à Abidjan, quel que soit le fuseau du navigateur.
 */
function abidjanDayAndMinutes(now: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Abidjan",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  let day = 0;
  let hour = 0;
  let minute = 0;
  for (const part of parts) {
    if (part.type === "weekday") day = WEEKDAY_TO_INDEX[part.value] ?? 0;
    if (part.type === "hour") hour = Number(part.value) % 24;
    if (part.type === "minute") minute = Number(part.value);
  }
  return { day, minutes: hour * 60 + minute };
}

/**
 * Statut d'ouverture déduit des horaires réels. Fonction pure (aucun état
 * React) : appelable au rendu, dans une boucle de rendu, ou dans un hook.
 * L'heure est calculée à Abidjan (`Africa/Abidjan`).
 */
export function getAvailability(
  schedule: DayService[],
  now: Date = new Date()
): Availability {
  const { day, minutes } = abidjanDayAndMinutes(now);
  const service = schedule[day];

  if (service.open && service.close) {
    const opening = toMinutes(service.open);
    const closing = toMinutes(service.close);

    if (minutes >= opening && minutes < closing) {
      return closing - minutes <= CLOSING_WINDOW
        ? {
            tone: "closing",
            label: "Dernières tables",
            detail: `fermeture ${frenchHour(closing)}`,
          }
        : {
            tone: "open",
            label: "Ouvert",
            detail: `jusqu'à ${frenchHour(closing)}`,
          };
    }

    if (minutes < opening) {
      return {
        tone: "closed",
        label: "Service du soir",
        detail: `ouvre ${nextService(schedule, day, minutes)}`,
      };
    }
  }

  return {
    tone: "closed",
    label: "Fermé",
    detail: `réouverture ${nextService(schedule, day, minutes)}`,
  };
}

/** Groupe de jours consécutifs partageant le même créneau. */
interface ServiceGroup {
  first: number;
  last: number;
  text: string;
  closed: boolean;
}

/**
 * Regroupe les jours consécutifs ayant le même créneau, en partant de lundi.
 * `label` fabrique le texte du créneau (format long ou compact).
 */
function groupServices(
  schedule: DayService[],
  label: (service: DayService) => string
): ServiceGroup[] {
  const week = [1, 2, 3, 4, 5, 6, 0]; // lundi → dimanche
  const groups: ServiceGroup[] = [];

  for (const day of week) {
    const service = schedule[day];
    const text = label(service);
    const previous = groups[groups.length - 1];

    if (previous && previous.text === text && day === (previous.last + 1) % 7) {
      previous.last = day;
      continue;
    }
    groups.push({ first: day, last: day, text, closed: !service.open });
  }

  return groups;
}

/** Jours de fermeture rejetés en fin de liste, comme sur une carte papier. */
const closedLast = (a: ServiceGroup, b: ServiceGroup): number =>
  Number(a.closed) - Number(b.closed);

const rangeLabel = (service: DayService): string =>
  service.open && service.close
    ? `${frenchHour(toMinutes(service.open))} à ${frenchHour(toMinutes(service.close))}`
    : "Fermé";

/**
 * Lignes d'horaire affichées (section Infos, pied de page), générées depuis
 * les mêmes données que le statut en direct : impossible d'afficher un horaire
 * que l'établissement ne pratique plus.
 */
export function formatHourGroups(
  schedule: DayService[]
): { days: string; time: string }[] {
  return groupServices(schedule, rangeLabel)
    .sort(closedLast)
    .map((group) => ({
      days:
        group.first === group.last
          ? dayNames[group.first]
          : `${dayNames[group.first]}–${dayNames[group.last]}`,
      time: group.text,
    }));
}

/**
 * Ligne d'horaire compacte pour les cartes d'adresses :
 * "Mar–Jeu 18h30 à 23h00 · Ven–Sam 18h30 à 00h00 · Dim. 12h00 à 15h00 · Lun. fermé".
 */
export function formatCompactHours(schedule: DayService[]): string {
  return groupServices(schedule, rangeLabel)
    .sort(closedLast)
    .map((group) => {
      const from = dayNames[group.first].slice(0, 3);
      const to = dayNames[group.last].slice(0, 3);
      const days =
        group.first === group.last ? `${from}.` : `${from}–${to}`;
      return `${days} ${group.text.toLowerCase()}`;
    })
    .join(" · ");
}
