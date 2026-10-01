import { lateSchedule, standardSchedule, type DayService } from "./hours";

export interface Location {
  id: string;
  number: string;
  name: string;
  address: string;
  phone: string;
  /**
   * Texte d'horaire forcé, pour une adresse qui n'a pas encore de service
   * (carte en attente d'ouverture). Sinon, laissé vide : la ligne affichée est
   * générée depuis `schedule`, comme le statut en direct.
   */
  hours?: string;
  /**
   * Photo réelle de l'adresse : `public/images/locations/<id>.jpg`.
   * Tant que le tirage n'est pas déposé, `ui/FoodMedia.tsx` affiche une
   * carte dessinée plutôt qu'un cadre vide.
   */
  image: string;
  mapsUrl: string;
  /** "bientot" : carte en attente d'ouverture (sans réservation) */
  status?: "ouvert" | "bientot";
  /** Horaires de référence de l'adresse (défaut : `standardSchedule`). */
  schedule?: DayService[];
}

export const locations: Location[] = [
  {
    id: "lyon-3",
    number: "01",
    name: "Texas GrillZ — Lyon 3ème",
    address: "12 Rue de la Villette, 69003 Lyon",
    phone: "04 78 00 00 00",
    schedule: standardSchedule,
    image: "/images/locations/lyon-3.jpg",
    mapsUrl: "https://maps.google.com/?q=12+Rue+de+la+Villette+69003+Lyon",
  },
  {
    id: "lyon-7",
    number: "02",
    name: "Texas GrillZ — Lyon 7ème",
    address: "45 Avenue Berthelot, 69007 Lyon",
    phone: "04 78 00 00 01",
    schedule: lateSchedule,
    image: "/images/locations/lyon-7.jpg",
    mapsUrl: "https://maps.google.com/?q=45+Avenue+Berthelot+69007+Lyon",
  },
  {
    id: "villeurbanne",
    number: "03",
    name: "Texas GrillZ — Villeurbanne",
    address: "8 Cours Émile Zola, 69100 Villeurbanne",
    phone: "04 78 00 00 02",
    schedule: standardSchedule,
    image: "/images/locations/villeurbanne.jpg",
    mapsUrl: "https://maps.google.com/?q=8+Cours+Emile+Zola+69100+Villeurbanne",
  },
  {
    id: "caluire",
    number: "04",
    name: "Texas GrillZ — Caluire",
    address: "Secteur Croix-Rousse / Caluire — adresse confirmée à l'ouverture",
    phone: "04 78 00 00 00",
    hours: "Ouverture automne 2026",
    image: "/images/locations/caluire.jpg",
    mapsUrl: "https://maps.google.com/?q=Caluire-et-Cuire",
    status: "bientot",
  },
];
