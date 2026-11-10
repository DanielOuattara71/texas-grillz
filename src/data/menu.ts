/**
 * Carte de Texas GrillZ, Abidjan.
 *
 * TODO(client): confirmer que le menu « Menu » est celui en vigueur.
 * Les prix ci-dessous sont ceux du menu le plus récent fourni par le client
 * (voir docs/prompt-remplacement-contenu-texas-grillz.md §5.0).
 * Prix en FCFA entiers.
 */
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category:
    | "mix-grill"
    | "saisonniers"
    | "bbq"
    | "burgers"
    | "brochettes"
    | "garnitures"
    | "weekend"
    | "boissons";
  /**
   * « À partir de » : affiche « dès 7 000 FCFA » au lieu de « 7 000 FCFA ».
   */
  priceFrom?: boolean;
  /**
   * Restaurants qui servent ce plat (`restoID`).
   * Absent/vide = servi dans tous les restaurants actifs.
   */
  // TODO(client): confirmer l'association plat / restaurant.
  locationIds?: string[];
  /** Alias singulier, lu en priorité si présent. */
  locationId?: string;
  image: string;
}

const dish = (
  id: string,
  name: string,
  description: string,
  price: number,
  category: MenuItem["category"],
  extra?: Pick<MenuItem, "priceFrom" | "locationIds" | "locationId">
): MenuItem => ({
  id,
  name,
  description,
  price,
  category,
  image: `/images/products/${id}.jpg`,
  ...extra,
});

export const menuItems: MenuItem[] = [
  // Viande BBQ
  dish("steak-filet-boeuf", "Steak de filet de bœuf", "« Le Rolls-Royce des steaks » : tendre et juteux.", 13000, "bbq"),
  dish("poulet-texan-demi", "Poulet texan (demi)", "« Le suprême des suprêmes », mariné et grillé au barbecue.", 5000, "bbq"),
  dish("poulet-texan-entier", "Poulet texan (entier)", "« Le suprême des suprêmes », mariné et grillé au barbecue.", 9000, "bbq"),
  dish("cotes-de-porc", "Côtes de porc", "Deux côtes de porc braisées au feu de charbon avec la sauce secrète de la maison.", 11000, "bbq"),
  dish("ribs-o-ribs", "Ribs Ô Ribs", "Travers de porc assaisonnés à la sauce secrète, laqués et tendres.", 13000, "bbq"),

  // Burgers
  dish("cheeseburger", "Burger Cheese", "Steak de bœuf, fromage, légumes et sauce spéciale.", 6000, "burgers"),
  dish("grand-canyon", "Grand Canyon", "Deux steaks et deux tranches de fromage.", 10000, "burgers"),
  dish("juicy-maxwell", "Juicy Maxwell (simple)", "Un steak avec un cœur fondant de fromage. « Vive le Roi de la Planète ».", 6000, "burgers"),
  dish("juicy-maxwell-double", "Juicy Maxwell (double)", "Double steak, cœur fondant de fromage.", 10000, "burgers"),
  dish("texas-crunchy", "Texas Crunchy (simple)", "Un steak, une tranche de cheddar, une omelette et deux tranches de bacon.", 6000, "burgers"),
  dish("texas-crunchy-double", "Texas Crunchy (double)", "Deux steaks, deux tranches de cheddar, une omelette et deux tranches de bacon.", 10000, "burgers"),
  dish("dirty-burger", "Dirty Burger", "Un steak de burger au fromage, un œuf et trois tranches de steak de filet de bœuf.", 12000, "burgers"),

  // Mix Grill
  dish("mix-boeuf-poulet", "Mix Grill Bœuf / Poulet", "Bœuf et poulet grillés, servis avec des sauces.", 35000, "mix-grill"),
  dish("mix-boeuf-poulet-porc", "Mix Grill Bœuf / Poulet / Porc", "Bœuf, poulet et porc grillés.", 50000, "mix-grill"),
  dish("mix-boeuf-poulet-porc-gambas", "Mix Grill Bœuf / Poulet / Porc / Gambas", "Bœuf, poulet, porc et gambas grillés.", 65000, "mix-grill"),

  // Saisonniers
  dish("surf-n-turf", "Surf N'Turf", "Gambas tigrées et filet de bœuf émincé : entre terre et mer.", 20000, "saisonniers"),
  dish("steak-tagliatelles", "Steak tagliatelles", "Steak couché sur un lit de tagliatelles à la crème fraîche.", 14000, "saisonniers"),
  dish("gambas-tagliatelles", "Gambas tagliatelles", "Gambas tigrées sur des tagliatelles à la crème fraîche.", 19000, "saisonniers"),
  dish("gambas", "Gambas", "Plat de gambas tigrées.", 18000, "saisonniers"),
  dish("entrecote-boeuf", "Entrecôtes de bœuf", "Entrecôtes de bœuf grillées.", 15000, "saisonniers"),
  dish("souris-agneau", "Souris d'agneau", "Souris d'agneau.", 15000, "saisonniers"),
  dish("frite-fromage-boeuf", "Frite fromage bœuf", "Frites au fromage, émincé de filet de bœuf.", 10000, "saisonniers"),
  dish("frite-fromage-poulet", "Frite fromage poulet", "Frites au fromage, émincé de poulet.", 10000, "saisonniers"),

  // Brochettes (servies sans accompagnement)
  dish("brochette-boeuf", "Brochette de filet de bœuf", "Filet de bœuf grillé à la braise.", 2000, "brochettes"),
  dish("brochette-poulet", "Brochette de blanc de poulet", "Blanc de poulet mariné et grillé à la braise.", 2000, "brochettes"),

  // Garnitures
  dish("garn-alloco", "Alloco (banane plantain frite)", "", 1500, "garnitures"),
  dish("garn-frites", "Frites", "", 1500, "garnitures"),
  dish("garn-attieke", "Attiéké", "", 1000, "garnitures"),
  dish("garn-salade", "Salade", "", 3000, "garnitures"),
  dish("garn-tagliatelles", "Tagliatelles", "", 3000, "garnitures"),
  dish("garn-puree", "Purée de pommes de terre", "", 3000, "garnitures"),
  dish("garn-pomme-sautee", "Pommes sautées", "", 3000, "garnitures"),

  // Week-end Carnivore
  // TODO(client): toujours valable ?
  dish("we-poulet-entier", "Poulet entier", "Servi avec attiéké.", 8000, "weekend"),
  dish("we-travers", "Travers", "Servi avec attiéké.", 10000, "weekend"),
  dish("we-burger", "Burger", "Servi avec attiéké.", 5000, "weekend"),
  dish("we-frite-fromage", "Frite fromage", "Servi avec attiéké.", 10000, "weekend"),
  dish("we-steak", "Steak", "Servi avec attiéké.", 10000, "weekend"),
  dish("we-supp-alloco-frites", "Supplément alloco / frites", "À ajouter à votre plat.", 1000, "weekend"),
  dish("we-supp-tagliatelles", "Supplément tagliatelles", "À ajouter à votre plat.", 2000, "weekend"),

  // Boissons
  dish("boisson-coca-cola", "Coca-Cola", "", 1000, "boissons"),
  dish("boisson-fanta-cocktail", "Fanta cocktail", "", 1000, "boissons"),
  dish("boisson-sprite", "Sprite", "", 1000, "boissons"),
  dish("boisson-orangina", "Orangina", "", 1000, "boissons"),
  dish("boisson-youki-moka", "Youki moka", "", 1000, "boissons"),
  dish("boisson-codys-energie", "Cody's Énergie", "", 1000, "boissons"),
  dish("boisson-tonic", "Tonic", "", 1000, "boissons"),
  dish("boisson-chill", "Chill", "", 1000, "boissons"),
  dish("boisson-bavaria", "Bavaria", "", 1000, "boissons"),
  dish("boisson-beaufort", "Beaufort", "", 1000, "boissons"),
  dish("boisson-mutzig", "Mutzig", "", 1000, "boissons"),
  dish("boisson-tuborg", "Tuborg", "", 1000, "boissons"),
  dish("boisson-guinness", "Guinness", "", 1000, "boissons"),
  dish("boisson-malta-guinness", "Malta Guinness", "", 1000, "boissons"),
  // TODO(client): un des deux est à 1500
  dish("boisson-class", "Class", "", 1000, "boissons"),
  dish("boisson-desperados", "Desperados", "", 1000, "boissons"),
  dish("boisson-eau", "Eau", "", 1000, "boissons"),
  dish("boisson-jus-naturel-verre", "Jus naturel (verre)", "", 1000, "boissons"),
  dish("boisson-jus-naturel-bouteille", "Jus naturel (bouteille)", "", 3500, "boissons"),
  dish("boisson-tournee-liqueur", "Tournée de liqueur", "", 4000, "boissons"),
  dish("boisson-vin-rouge", "Vin rouge", "", 7000, "boissons", { priceFrom: true }),
  dish("boisson-vin-blanc", "Vin blanc", "", 7000, "boissons", { priceFrom: true }),
  dish("boisson-vin-rose", "Vin rosé", "", 7000, "boissons", { priceFrom: true }),
  dish("cocktail-alcoolise", "Cocktail alcoolisé", "", 5000, "boissons"),
  dish("cocktail-sans-alcool", "Cocktail sans alcool", "", 4000, "boissons"),
  dish("six-shots", "6 shots", "", 4000, "boissons"),
];

// TODO(client): quels plats sont encore servis ?
// Plats d'anciens menus, absents du menu récent, non ajoutés sans confirmation :
// Ô Kiosque (pâte à la viande de bœuf mixée aux fruits de mer, 10 000),
// Tacos bœuf ou poulet (7 000), Steak de porc (dès 6 000),
// Côte de mouton braisée au charbon (7 000), brochette de porc (2 000).
// Plats cités par des annuaires sans prix : Triple Cheese, burgers de poulet, menu halal.
