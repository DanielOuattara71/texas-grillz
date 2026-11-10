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
    id: "burgers",
    number: "01",
    title: "Burgers",
    description:
      "Burger Cheese, Juicy Maxwell, Texas Crunchy et Grand Canyon, en simple ou en double.",
    href: "#menu",
  },
  {
    id: "bbq-ribs",
    number: "02",
    title: "BBQ & Ribs",
    description:
      "Poulet texan, côtes de porc, steak de filet et Ribs Ô Ribs à la sauce secrète de la maison.",
    href: "#menu",
  },
  {
    id: "mix-saisonniers",
    number: "03",
    title: "Mix Grill & Saisonniers",
    description:
      "Plateaux à partager et suggestions du moment : surf n' turf, gambas, tagliatelles et souris d'agneau.",
    href: "#menu",
  },
  {
    id: "weekend",
    number: "04",
    title: "Week-end Carnivore",
    description:
      "Le menu du week-end : poulet entier, travers, burger, frite fromage et steak, servis avec attiéké.",
    href: "#menu",
    highlighted: true,
  },
];
