import { standardSchedule, type DayService } from "./hours";

export interface Location {
  id: string;
  number: string;
  name: string;
  address: string;
  phone: string;
  /**
   * Texte d'horaire forcé. Non utilisé ici : la ligne affichée est générée
   * depuis `schedule`, comme le statut en direct.
   */
  hours?: string;
  /**
   * Photo réelle de l'adresse : `public/images/locations/<id>.jpg`.
   * Tant que le tirage n'est pas déposé, `ui/FoodMedia.tsx` affiche une
   * carte dessinée plutôt qu'un cadre vide.
   */
  image: string;
  mapsUrl: string;
  /** Horaires de référence de l'adresse (défaut : `standardSchedule`). */
  schedule?: DayService[];
  /** Services connus de l'adresse, quand ils sont documentés. */
  services?: string[];
  /** Actif = visible et réservable sur le site. */
  active?: boolean;
  /** Visible sur le site public (indépendant d'actif). */
  published?: boolean;
  /** Statut historique, gardé pour compatibilité. */
  status?: "ouvert" | "bientot";
}

export const locations: Location[] = [
  {
    id: "zone-4",
    number: "01",
    name: "Texas GrillZ, Marcory Zone 4",
    address: "Rue Lumière, en face du Cours Sévigné, Zone 4 C, Marcory",
    // TODO(client): confirmer
    phone: "07 77 47 37 37",
    schedule: standardSchedule,
    image: "/images/locations/zone-4.jpg",
    mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=5.3485583%2C-3.9769516",
    services: [
      "Climatisation",
      "Bar",
      "Terrasse",
      "Menu halal",
      "Ambiance lounge",
      "Ouverture le 1er avril 2022",
    ],
  },
  {
    id: "riviera-jardin",
    number: "02",
    name: "Texas GrillZ, Riviera Jardin",
    // TODO(client): rue exacte
    address: "Riviera Jardin, Cocody",
    phone: "07 77 59 59 47",
    schedule: standardSchedule,
    image: "/images/locations/riviera-jardin.jpg",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Texas+GrillZ+Riviera+Jardin+Abidjan",
  },
  {
    id: "deux-plateaux-latrille",
    number: "03",
    name: "Texas GrillZ, Deux-Plateaux Latrille",
    // TODO(client): rue exacte
    address: "Deux-Plateaux, Boulevard Latrille, Cocody",
    phone: "07 77 59 59 47",
    schedule: standardSchedule,
    image: "/images/locations/deux-plateaux-latrille.jpg",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Texas+GrillZ+Deux+Plateaux+Latrille",
  },
  {
    id: "yopougon-maroc",
    number: "04",
    name: "Texas GrillZ, Yopougon Maroc",
    address: "Carrefour Canaris (antenne), Yopougon Maroc",
    // TODO(client): confirmer
    phone: "07 77 45 00 00",
    schedule: standardSchedule,
    image: "/images/locations/yopougon-maroc.jpg",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Texas+GrillZ+Yopougon+Maroc",
  },
  {
    id: "cocody-cite-des-arts",
    number: "05",
    name: "Texas GrillZ, Cocody Cité des Arts",
    // TODO(client): adresse et ouverture
    address: "Cocody Cité des Arts",
    phone: "07 77 59 59 47",
    schedule: standardSchedule,
    image: "/images/locations/cocody-cite-des-arts.jpg",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Texas+GrillZ+Cocody+Cit%C3%A9+des+Arts",
  },
];

// TODO(client): confirmer adresse et numéro de Zone 4
// Adresse alternative signalée pour Zone 4 par une fiche Google :
// « Rue de Francisco, Échangeur Félix Houphouët-Boigny (FHB) », téléphone 07 03 09 09 09.
