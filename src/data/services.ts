export interface Service {
  id: string;
  number: string;
  title: string;
  description: string;
  href: string;
  highlighted?: boolean;
}

export const services: Service[] = [
  {
    id: "brisket",
    number: "01",
    title: "Brisket & Viandes Fumées",
    description: "Poitrine de bœuf fumée 12 heures au bois de hêtre, tendreté incomparable et jus de cuisson réduit.",
    href: "#menu",
  },
  {
    id: "ribs",
    number: "02",
    title: "Ribs & Grillades",
    description: "Travers de porc laqués au miel et au bourbon, cuits lentement pour une chair qui se détache.",
    href: "#menu",
  },
  {
    id: "accompagnements",
    number: "03",
    title: "Accompagnements Maison",
    description: "Mac & cheese au cheddar affiné, coleslaw frais, cornbread au miel et recettes de la maison.",
    href: "#menu",
  },
  {
    id: "evenements",
    number: "04",
    title: "Événements & Privatisation",
    description: "Privatisation, séminaires et réceptions. Une équipe dédiée pour vos moments de partage.",
    href: "#contact",
    highlighted: true,
  },
];
