export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "viandes" | "accompagnements" | "desserts";
  badge?: "signature" | "best-seller" | "nouveau";
  image: string;
  /**
   * Commandes du mois écoulé — alimente le classement « les plus commandés ».
   * Valeurs de démonstration : à remplacer par un export du système de caisse.
   */
  orders: number;
}

export const menuItems: MenuItem[] = [
  {
    id: "brisket",
    name: "Brisket Fumé",
    description: "Poitrine de bœuf fumée 12h au bois de hêtre, jus de cuisson réduit",
    price: 24,
    category: "viandes",
    badge: "signature",
    image: "/images/products/brisket.svg",
    orders: 412,
  },
  {
    id: "ribs",
    name: "Ribs St. Louis",
    description: "Travers de porc laqués au miel et au bourbon, fumage 8h",
    price: 22,
    category: "viandes",
    badge: "best-seller",
    image: "/images/products/ribs.svg",
    orders: 388,
  },
  {
    id: "pulled-pork",
    name: "Pulled Pork",
    description: "Épaule de porc effilochée, sauce vinaigre et épicée maison",
    price: 18,
    category: "viandes",
    image: "/images/products/pulled-pork.svg",
    orders: 265,
  },
  {
    id: "chicken",
    name: "Poulet Fermier",
    description: "Demi-poulet fermier mariné 24h, laqué au sirop d'érable",
    price: 19,
    category: "viandes",
    image: "/images/products/chicken.svg",
    orders: 198,
  },
  {
    id: "mac-cheese",
    name: "Mac & Cheese",
    description: "Macaroni au cheddar affiné 18 mois, croûte de chapelure",
    price: 9,
    category: "accompagnements",
    image: "/images/products/mac-cheese.svg",
    orders: 356,
  },
  {
    id: "coleslaw",
    name: "Coleslaw",
    description: "Chou blanc et carottes, vinaigrette crémeuse au céleri",
    price: 6,
    category: "accompagnements",
    image: "/images/products/coleslaw.svg",
    orders: 289,
  },
  {
    id: "cornbread",
    name: "Cornbread",
    description: "Pain de maïs au miel, servi tiède avec beurre fondu",
    price: 5,
    category: "accompagnements",
    badge: "nouveau",
    image: "/images/products/cornbread.svg",
    orders: 341,
  },
  {
    id: "pecan-pie",
    name: "Pecan Pie",
    description: "Tarte aux noix de pécan caramélisées, crème fouettée",
    price: 8,
    category: "desserts",
    image: "/images/products/pecan-pie.svg",
    orders: 224,
  },
];
