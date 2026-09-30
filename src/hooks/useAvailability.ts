import { useEffect, useState } from "react";
import { standardSchedule, type DayService } from "../data/hours";
import { getAvailability, type Availability } from "../utils/availability";

/**
 * Statut d'ouverture en direct, recalculé chaque minute : la pastille reste
 * exacte si l'onglet reste ouvert au-delà de l'heure de fermeture.
 * `standardSchedule` est une constante de module : sa référence est stable,
 * l'intervalle n'est donc jamais recréé.
 */
export function useAvailability(
  schedule: DayService[] = standardSchedule
): Availability {
  const [availability, setAvailability] = useState<Availability>(() =>
    getAvailability(schedule)
  );

  useEffect(() => {
    const id = window.setInterval(
      () => setAvailability(getAvailability(schedule)),
      60_000
    );
    return () => window.clearInterval(id);
  }, [schedule]);

  return availability;
}
