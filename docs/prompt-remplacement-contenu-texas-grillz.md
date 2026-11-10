# PROMPT — Remplacer le contenu fictif par le contenu réel de Texas GrillZ (Abidjan)

> À coller dans Claude Code / Cursor, à la racine du projet (dossier contenant `src/`).

---

## 0. Rôle et contexte

Tu es développeur senior React/TypeScript. Le projet est un site vitrine (Vite + React + TS + Tailwind) avec une administration sous `/admin`. Les données par défaut vivent dans `src/data/*.ts` ; `src/content/store.tsx` les fusionne avec `GET /api/content`.

Le contenu actuel est **entièrement fictif** (restaurant de barbecue fumé à Lyon, prix en euros). L'entreprise réelle est **Texas GrillZ**, un grill texan à **Abidjan (Côte d'Ivoire)**. Ta mission : remplacer toutes les informations fictives par les informations réelles ci-dessous, avec uniquement les modifications de code nécessaires pour que cela fonctionne.

## 1. Règles impératives

1. **N'invente rien.** Toute donnée absente de ce document reste un placeholder visible `// TODO(client): …` dans le code, et n'est pas affichée sur le site.
2. Les prix sont des **entiers en FCFA**, jamais d'euros, jamais de décimales.
3. Aucune note, aucun avis, aucune statistique de commandes factice ne doit rester affichée.
4. Garde le comportement « le site ne dépend jamais du backend » (repli sur `src/data`).
5. Ne refais pas le design. Ne corrige pas les autres anomalies de l'admin dans cette passe (voir §9).
6. À la fin, `npx tsc --noEmit` et `npm run build` doivent passer sans erreur.

## 2. Identité

| Champ | Valeur |
|---|---|
| Nom | Texas GrillZ (logo : « TEXAS GRILLZ BARBECUE ») |
| Année | **2017** (mention « EST. 2017 » sur le logo des menus ; un annuaire dit 2015, ignorer) |
| Fondateur | Maxwell Goris, surnommé « King Maxwell » |
| Signature de marque | « Yo baby, what's up ? » |
| Accroche (`tagline`) | Grillades et burgers à l'américaine — Abidjan |
| Téléphone principal | `+225 07 77 59 59 47` (affichage : `07 77 59 59 47`) |
| Second numéro | `+225 05 01 90 30 90` (menu officiel). Autres variantes vues en ligne, non retenues : `07 07 03 09 09` / `07 03 09 09 09` → TODO(client) |
| WhatsApp | `+225 07 77 59 59 47` → `https://wa.me/2250777595947` |
| Email | `texas.grillz15@gmail.com` (page Facebook ; un annuaire donne `texasgrillz@hotmail.com`, TODO(client): confirmer lequel afficher) |
| Facebook | `https://www.facebook.com/p/Texas-GrillZ-100068946285002/` (page officielle, indiquée par le client) |
| X, Instagram | Icônes présentes sur les menus, URL inconnues → TODO(client) |
| TikTok | `https://www.tiktok.com/@texasgrillz` (compte « Texas Grillz Abidjan » vu sur TikTok ; remplace le faux `@texasgrill`) |
| Adresse principale (`site.address`) | Rue Lumière, en face du Cours Sévigné, Zone 4 C, Marcory, Abidjan |

## 3. Adresses (`src/data/locations.ts`)

La page Facebook officielle liste **5 lieux** : Zone 4, Riviera Jardin, Yopougon, Deux-Plateaux Latrille et Cocody Cité des Arts. Le menu papier en cite 4 (sans Cocody Cité des Arts). Créer **5 entrées**. N'afficher une adresse postale que si elle est connue ; sinon n'afficher que le quartier, avec `// TODO(client): adresse précise`. Supprimer Lyon 3ᵉ/7ᵉ, Villeurbanne, Caluire et le statut « bientôt ».

| id | Nom | Adresse affichée | Téléphone | Carte |
|---|---|---|---|---|
| `zone-4` | Texas GrillZ — Marcory Zone 4 | Rue Lumière, en face du Cours Sévigné, Zone 4 C, Marcory | `+225 07 77 47 37 37` (TODO: confirmer) | GPS `5.3485583,-3.9769516` → `https://www.google.com/maps/dir/?api=1&destination=5.3485583%2C-3.9769516` |
| `riviera-jardin` | Texas GrillZ — Riviera Jardin | Riviera Jardin, Cocody `// TODO(client): rue exacte` (un annuaire donne Boulevard Latrille ; une fiche Google donne rue Dr Bernard Adiaffi, Treichville) | `+225 07 77 59 59 47` | recherche Google Maps « Texas GrillZ Riviera Jardin Abidjan » |
| `deux-plateaux-latrille` | Texas GrillZ — Deux-Plateaux Latrille | Deux-Plateaux, Boulevard Latrille, Cocody `// TODO(client): rue exacte` | `+225 07 77 59 59 47` | recherche Google Maps « Texas GrillZ Deux Plateaux Latrille » |
| `yopougon-maroc` | Texas GrillZ — Yopougon Maroc | Carrefour Canaris (antenne), Yopougon Maroc | `+225 07 77 45 00 00` (TODO: confirmer) | recherche Google Maps « Texas GrillZ Yopougon Maroc » |
| `cocody-cite-des-arts` | Texas GrillZ — Cocody Cité des Arts | Cocody Cité des Arts `// TODO(client): adresse et ouverture` | `+225 07 77 59 59 47` | recherche Google Maps « Texas GrillZ Cocody Cité des Arts » |

Adresse alternative signalée pour Zone 4 par une fiche Google : « Rue de Francisco, Échangeur Félix Houphouët-Boigny (FHB) », téléphone `07 03 09 09 09` (proche du `07 07 03 09 09` d'un annuaire, sans être identique) : ne pas afficher, ajouter `// TODO(client): confirmer adresse et numéro de Zone 4`.

**Notes et avis** : ne jamais afficher de note. Les sources donnent 3,7/5 (11 avis, fiche Google), 4,3/5 (~2 200 avis, agrégateur), 4,1/5 (~3 100 avis, agrégateur) et « 98 % recommandent » (3 517 avis Facebook) : elles ne sont pas comparables. À remplacer plus tard par la note Google officielle, avec son lien.

Services connus de Zone 4 (champ optionnel `services`, à ajouter si simple) : climatisation, bar, terrasse, menu halal, ambiance lounge, ouverture le 1er avril 2022. Photos : garder les chemins `/images/locations/<id>.jpg` (le composant `FoodMedia` dessine un cadre de repli).

## 4. Horaires (`src/data/hours.ts`) — PROVISOIRES

Sources partielles : Go Africa donne lundi → jeudi 12h00–23h30. Vendredi → dimanche illisible (« 12h00–12h00 »). Appliquer :
- lundi → jeudi : `12:00`–`23:30` (Go Africa ; une fiche indique aussi « ouvert jusqu'à 23h30 » à Riviera Jardin)
- vendredi → dimanche : `12:00`–`24:00` avec `// TODO(client): horaires du week-end à confirmer`

Les fiches Google des deux adresses indiquent aussi « ouvre à 12:00 », ce qui confirme l'ouverture à midi (heure de fermeture toujours inconnue).

Un seul tableau `standardSchedule` pour toutes les adresses ; supprimer `lateSchedule`. Les horaires de service des menus (« à partir de 11h » dans un annuaire) sont non confirmés : ne pas les utiliser.

## 5. Carte (`src/data/menu.ts`)

### 5.0 Sources, chronologie et règle de prix

Le client a fourni 13 photos de menus de **plusieurs époques** (aucune n'est datée). En comparant les prix, l'ordre probable, du plus ancien au plus récent, est :

1. Menus noir et blanc « THE MENU VIANDES-BBQ / THE BURGER MENU » (steak de filet dès 7 000, burgers 8 000 / 5 000, brochettes 1 500 puis 2 000).
2. Menu en couleur « Menu Viande - BBQ / Menu Burger / Menu Saisonnier / Menu Boisson » (Ô Kiosque, Tacos, Dirty Burger 9 000).
3. Menu « Menu Viande BBQ / Menu Burgers / Menu Mix Grill » (steak 10 000, mix 30 000 / 45 000 / 60 000).
4. Flyer « Texas GrillZ Barbecue » (steak 12 000, mix 30 000 / 45 000 / 60 000, burgers 6 000).
5. **Menu « Menu » le plus récent** (steak 13 000, mix 35 000 / 50 000 / 65 000, Dirty Burger 12 000). Il correspond presque ligne à ligne au menu de livraison Yango Deli (fiche Yandex).
6. Menu « Week-end Carnivore » : offre à part, aux prix plus bas.

**Règle** : utiliser les prix du menu n° 5 comme prix courants. Les menus 1 à 4 ne servent qu'à compléter les descriptions et à repérer des plats retirés. Les prix du menu n° 5 sont à confirmer par le restaurant (`// TODO(client): confirmer que le menu « Menu » est celui en vigueur`). Les pages ChicMenu et Restaurant Guru n'ont pas pu être lues.

### 5.1 Changements de type

- `category` devient : `"mix-grill" | "saisonniers" | "bbq" | "burgers" | "brochettes" | "garnitures" | "weekend" | "boissons"` (adapter `CategoryId` et le tableau `categories` de `src/utils/menu.ts`, dans cet ordre).
- Supprimer le champ `orders` et tout ce qui en dépend : `topOrdered`, `src/components/ui/TopOrdered.tsx`, le bloc « plat le plus commandé » et le texte « commandes · 30 derniers jours » dans `Menu.tsx`.
- Retirer les badges `best-seller` et `nouveau` des données. Si aucun plat n'a de badge, masquer les `FilterChips` de la carte.
- `image` : `"/images/products/<id>.svg"` (le mécanisme `photoSlot` vise le `.jpg` correspondant, `FoodMedia` dessine une assiette si l'image manque).

### 5.2 Libellés des catégories (`categories`)

| id | label | note |
|---|---|---|
| `mix-grill` | Mix Grill | Plateaux de viandes grillées à partager. |
| `saisonniers` | Saisonniers | Suggestions du moment. |
| `bbq` | Viande BBQ | Poulet texan, côtes de porc, steak et ribs, sauce secrète de la maison. |
| `burgers` | Burgers | Les burgers maison. |
| `brochettes` | Brochettes | Brochettes grillées, servies sans accompagnement. |
| `garnitures` | Garnitures | Accompagnements à ajouter à votre plat. |
| `weekend` | Week-end Carnivore | Menu du week-end. Accompagnement de base : attiéké. *(jours exacts et validité : TODO(client))* |
| `boissons` | Boissons | Softs, bières, jus, liqueurs et vins. |

### 5.3 Plats (prix du menu n° 5, en FCFA)

**Viande BBQ**

| id | Nom | Description | Prix |
|---|---|---|---|
| `steak-filet-boeuf` | Steak de filet de bœuf | « Le Rolls-Royce des steaks » : tendre et juteux. | 13000 |
| `poulet-texan-demi` | Poulet texan (demi) | « Le suprême des suprêmes », mariné et grillé au barbecue. | 5000 |
| `poulet-texan-entier` | Poulet texan (entier) | « Le suprême des suprêmes », mariné et grillé au barbecue. | 9000 |
| `cotes-de-porc` | Côtes de porc | Deux côtes de porc braisées au feu de charbon avec la sauce secrète de la maison. | 11000 |
| `ribs-o-ribs` | Ribs Ô Ribs | Travers de porc assaisonnés à la sauce secrète, laqués et tendres. | 13000 |

**Burgers**

| id | Nom | Description | Prix |
|---|---|---|---|
| `cheeseburger` | Burger Cheese | Steak de bœuf, fromage, légumes et sauce spéciale. | 6000 |
| `grand-canyon` | Grand Canyon | Deux steaks et deux tranches de fromage. | 10000 |
| `juicy-maxwell` | Juicy Maxwell (simple) | Un steak avec un cœur fondant de fromage. « Vive le Roi de la Planète ». | 6000 |
| `juicy-maxwell-double` | Juicy Maxwell (double) | Double steak, cœur fondant de fromage. | 10000 |
| `texas-crunchy` | Texas Crunchy (simple) | Un steak, une tranche de cheddar, une omelette et deux tranches de bacon. | 6000 |
| `texas-crunchy-double` | Texas Crunchy (double) | Deux steaks, deux tranches de cheddar, une omelette et deux tranches de bacon. | 10000 |
| `dirty-burger` | Dirty Burger | Un steak de burger au fromage, un œuf et trois tranches de steak de filet de bœuf. | 12000 |

**Mix Grill**

| id | Nom | Description | Prix |
|---|---|---|---|
| `mix-boeuf-poulet` | Mix Grill Bœuf / Poulet | Bœuf et poulet grillés, servis avec des sauces. | 35000 |
| `mix-boeuf-poulet-porc` | Mix Grill Bœuf / Poulet / Porc | Bœuf, poulet et porc grillés. | 50000 |
| `mix-boeuf-poulet-porc-gambas` | Mix Grill Bœuf / Poulet / Porc / Gambas | Bœuf, poulet, porc et gambas grillés. | 65000 |

**Saisonniers**

| id | Nom | Description | Prix |
|---|---|---|---|
| `surf-n-turf` | Surf N'Turf | Gambas tigrées et filet de bœuf émincé : entre terre et mer. | 20000 |
| `steak-tagliatelles` | Steak tagliatelles | Steak couché sur un lit de tagliatelles à la crème fraîche. | 14000 |
| `gambas-tagliatelles` | Gambas tagliatelles | Gambas tigrées sur des tagliatelles à la crème fraîche. | 19000 |
| `gambas` | Gambas | Plat de gambas tigrées. | 18000 |
| `entrecote-boeuf` | Entrecôtes de bœuf | Entrecôtes de bœuf grillées. | 15000 |
| `souris-agneau` | Souris d'agneau | Souris d'agneau. | 15000 |
| `frite-fromage-boeuf` | Frite fromage bœuf | Frites au fromage, émincé de filet de bœuf. | 10000 |
| `frite-fromage-poulet` | Frite fromage poulet | Frites au fromage, émincé de poulet. | 10000 |

> Le menu récent place « Frite fromage (poulet ou bœuf) » dans la rubrique BBQ, les menus précédents dans les Saisonniers : garder Saisonniers.

**Brochettes** (servies sans accompagnement)

| id | Nom | Description | Prix |
|---|---|---|---|
| `brochette-boeuf` | Brochette de filet de bœuf | Filet de bœuf grillé à la braise. | 2000 |
| `brochette-poulet` | Brochette de blanc de poulet | Blanc de poulet mariné et grillé à la braise. | 2000 |

**Garnitures**

| id | Nom | Prix |
|---|---|---|
| `garn-alloco` | Alloco (banane plantain frite) | 1500 |
| `garn-frites` | Frites | 1500 |
| `garn-attieke` | Attiéké | 1000 |
| `garn-salade` | Salade | 3000 |
| `garn-tagliatelles` | Tagliatelles | 3000 |
| `garn-puree` | Purée de pommes de terre | 3000 |
| `garn-pomme-sautee` | Pommes sautées | 3000 |

**Week-end Carnivore** (menu à part, prix plus bas : TODO(client): toujours valable ?)

| id | Nom | Description | Prix |
|---|---|---|---|
| `we-poulet-entier` | Poulet entier | Servi avec attiéké. | 8000 |
| `we-travers` | Travers | Servi avec attiéké. | 10000 |
| `we-burger` | Burger | Servi avec attiéké. | 5000 |
| `we-frite-fromage` | Frite fromage | Servi avec attiéké. | 10000 |
| `we-steak` | Steak | Servi avec attiéké. | 10000 |
| `we-supp-alloco-frites` | Supplément alloco / frites | À ajouter à votre plat. | 1000 |
| `we-supp-tagliatelles` | Supplément tagliatelles | À ajouter à votre plat. | 2000 |

**Boissons** — carte « Menu Boisson » (époque 2, à confirmer) ; offre cocktails du menu week-end

| id | Nom | Prix |
|---|---|---|
| `boisson-coca-cola`, `boisson-fanta-cocktail`, `boisson-sprite`, `boisson-orangina`, `boisson-youki-moka`, `boisson-codys-energie`, `boisson-tonic`, `boisson-chill` | Coca-Cola, Fanta cocktail, Sprite, Orangina, Youki moka, Cody's Énergie, Tonic, Chill | 1000 chacun |
| `boisson-bavaria`, `boisson-beaufort`, `boisson-mutzig`, `boisson-tuborg`, `boisson-guinness`, `boisson-malta-guinness` | Bavaria, Beaufort, Mutzig, Tuborg, Guinness, Malta Guinness | 1000 chacun |
| `boisson-class`, `boisson-desperados` | Class, Desperados | 1000 et 1500 (la photo ne permet pas de savoir lequel est à 1500 : mettre 1000 aux deux avec `// TODO(client): un des deux est à 1500`) |
| `boisson-eau` | Eau | 1000 |
| `boisson-jus-naturel-verre`, `boisson-jus-naturel-bouteille` | Jus naturel (verre / bouteille) | 1000 / 3500 |
| `boisson-tournee-liqueur` | Tournée de liqueur | 4000 |
| `boisson-vin-rouge`, `boisson-vin-blanc`, `boisson-vin-rose` | Vin rouge / blanc / rosé (« à partir de ») | 7000 chacun |
| `cocktail-alcoolise`, `cocktail-sans-alcool`, `six-shots` | Cocktail alcoolisé, cocktail sans alcool, 6 shots (menu week-end) | 5000, 4000, 4000 |

Pour « à partir de », ajouter au besoin un champ optionnel `priceFrom?: boolean` et afficher « dès 7 000 FCFA ».

> **Plats d'anciens menus, absents du menu récent : ne pas ajouter sans confirmation** : Ô Kiosque (pâte à la viande de bœuf mixée aux fruits de mer, 10 000), Tacos bœuf ou poulet (7 000), Steak de porc (dès 6 000), Côte de mouton braisée au charbon (7 000), brochette de porc (2 000). Plats cités par des annuaires sans prix : Triple Cheese, burgers de poulet, menu halal. `// TODO(client): quels plats sont encore servis ?`
>
> Règle ancienne à ne pas reprendre sans accord : « toute commande supérieure à 10 000 F : brochettes en plus à 1 500 F ». Promotions ponctuelles vues en ligne (ex. burger Juicy à 5 000, poulet texan entier à 6 000 sur quelques jours) : ne pas intégrer.

Descriptions vides acceptées (`""`) : adapter `Menu.tsx` pour ne pas rendre un paragraphe vide.

### 5.4 Format du prix (`src/utils/formatPrice.ts`)

```ts
export function formatPrice(price: number): string {
  return `${Math.round(price).toLocaleString("fr-FR")} FCFA`;
}
```

Adapter `priceSpan` (`utils/menu.ts`) en conséquence, et l'aide « Prix en euros » de `admin/ContentScreen.tsx` en « Prix en FCFA (entier) ». Mettre à jour `MENU_HINTS`.

## 6. Envies (`src/data/cravings.ts`) et services

Remplacer les 6 entrées par (garder `smokyReel` pour la tuile vedette) :

| id (= id du plat) | kicker | hook | stamp |
|---|---|---|---|
| `ribs-o-ribs` (vedette, vidéo) | Du grill à la table | Des travers de porc assaisonnés à la sauce secrète, tendres et juteux. | Ribs Ô Ribs |
| `juicy-maxwell` | Cœur fondant | Un steak, un cœur fondant de fromage : le Juicy Maxwell, simple ou double. | Cœur fondant |
| `mix-boeuf-poulet-porc` | À partager | Bœuf, poulet et porc grillés sur un seul plateau. | À partager |
| `poulet-texan-entier` | Façon texane | Le poulet texan, en demi ou en entier. | — |
| `grand-canyon` | Le grand format | Le Grand Canyon : pour les très grosses faims. | — |
| `steak-filet-boeuf` | Au feu | Un steak de filet de bœuf grillé. | — |

**Services (`src/data/services.ts`, 4 cartes)** : 1. Burgers · 2. BBQ & Ribs · 3. Mix Grill & Saisonniers · 4. Week-end Carnivore (le dernier est `highlighted: true`, `href: "#menu"`). Supprimer « Événements & Privatisation » (non confirmé).

## 7. Textes (`src/data/texts.ts`)

Remplacer par :

- `proof.cautionTape` : « Grillé à Abidjan — Zone 4, Riviera, Deux-Plateaux, Yopougon » · `rotatorLabel` : « Au grill : » · `ctaLabel` : « Réserver une table »
- `site.tonight` : `["Ribs Ô Ribs", "Poulet texan", "Mix Grill", "Juicy Maxwell"]`
- `hero.eyebrow` : « Grill texan — Abidjan » · `paragraph` : « Viandes marinées et grillées : ribs, steaks, poulet texan et burgers généreux, à partager entre amis. » · CTA inchangés.
- `cravings` : label « Envies du grill », title « Ça grille, », accent « ça se partage », subtitle « Ribs, burgers, mix grill : choisissez d'abord avec les yeux. »
- `marquee` : `["Ribs Ô Ribs", "Texas Crunchy", "Juicy Maxwell", "Grand Canyon", "Mix Grill", "Yo baby, what's up ?", "Abidjan"]`
- `concept` : label « Notre histoire », title « Grillé, », accent « partagé » ; subtitle « Depuis 2017, une cuisine de grill à l'américaine pensée pour Abidjan : des viandes marinées, des portions généreuses, à partager. » ; chapitres : *Le grill* (steaks, ribs et poulet texan cuits au feu), *La viande* (le fondateur revendique la viande fraîche plutôt que congelée), *Les burgers* (Juicy Maxwell, Texas Crunchy, Grand Canyon et leurs versions doubles), *La table* (mix grill et plateaux à partager) ; `chips` : `["Depuis 2017", "Viande fraîche", "Ribs Ô Ribs", "Abidjan"]` ; `frameCaption` : « Ce que vous voyez, vous le mangez » ; `frameNote` : « Grill · Abidjan » ; `stamp` : « Depuis 2017 » ; `quote` : « Yo baby, what's up ? » ; `quoteAuthor` : « King Maxwell » *(TODO(client): confirmer l'usage)*.
- `services` : label « Ce qu'on sert », title « Quatre », accent « Signatures », subtitle « Du burger au mix grill : quatre façons de vivre Texas GrillZ. »
- `menu` : label « La Carte », title « Nos », accent « Spécialités », subtitle « Ouvrez une catégorie pour dérouler les plats. Prix en FCFA. »
- `locations` : label « Nos Adresses », title « Nos adresses », accent « à Abidjan », subtitle « Retrouvez Texas GrillZ à Marcory Zone 4, Riviera Jardin, Deux-Plateaux, Yopougon et Cocody Cité des Arts. »
- `gallery.subtitle` : « Des plats servis chaque jour dans nos adresses d'Abidjan. »
- `info.reservationNote` : « Par téléphone, par WhatsApp ou avec le formulaire. »
- `contact.subtitle` : « Remplissez le formulaire : nous vous rappelons ou vous écrivons sur WhatsApp pour confirmer. » · `successNote` : « Merci ! Nous vous recontactons par téléphone ou WhatsApp pour confirmer votre table. » · `offlineNotice` : « Les demandes en ligne ne sont pas actives : appelez-nous ou écrivez-nous sur WhatsApp. »
- `historyTexts` : chapitre 1 « 01 — Les Débuts », heading `["Un grill de quartier,", "une adresse qui grandit"]`, paragraphes : « Texas GrillZ naît à Abidjan en 2017, d'une idée simple : de la viande fraîche, bien assaisonnée, grillée devant vous. » et « Son fondateur, Maxwell Goris, a choisi de miser sur la fraîcheur plutôt que sur la taille des grandes chaînes de fast-food. » ; chapitre 2 « 02 — L'Évolution », heading `["Plusieurs adresses,", "une même cuisine"]`, paragraphes : « Après ses premières adresses, l'enseigne ouvre le 1er avril 2022 à Marcory Zone 4, dans une version lounge plus aboutie. » et « Un chef venu de France y a formé les équipes ; la carte s'est enrichie d'un menu halal, de burgers de poulet et de spécialités d'agneau. *(TODO(client): confirmer que ces plats sont encore servis)* » ; `quote` : « Yo baby, what's up ? » ; `signature` : `{ name: "King Maxwell", role: "Fondateur" }`.

## 8. Autres fichiers à corriger

| Fichier | Action |
|---|---|
| `data/site.ts` | Remplacer `name`, `established: 2017`, `address`, `phone`, `email`, `social` (TikTok : `https://www.tiktok.com/@texasgrillz`). `rating` : rendre optionnel ; sans note réelle, **ne rien afficher** (masquer le bloc de note dans `Testimonials` et `ProofStrip`). |
| `data/site.ts` → `proofs` | Remplacer par `[{ value: 2017, from: 2005, label: "Texas GrillZ ouvre ses premières braises" }, { value: <nombre d'adresses de locations.ts>, label: "adresses à Abidjan" }]` (calculer la valeur depuis la liste des adresses). Adapter `ProofStrip` à 2 éléments. |
| `data/testimonials.ts` | Exporter `[]`. La section Avis et le carrousel ne s'affichent pas quand la liste est vide ; retirer le lien « Avis » de `navLinks` dans ce cas. |
| `data/visuals.ts` | Corriger les `alt` (« Logo Texas GrillZ », etc.), enlever « Salle de Texas GrillZ en service » si la photo `lyon-3.jpg` est utilisée : pointer vers `/images/locations/zone-4.jpg`. Garder les photos de galerie existantes (elles montrent de vrais plats). |
| `components/sections/ProofStrip.tsx` | Supprimer le texte en dur « Lyon 3ᵉ ». |
| `components/sections/Locations.tsx` | Supprimer la phrase en dur « tables ouvertes, une quatrième en cours d'installation » et « Ouverture automne 2026 » ; générer le nombre d'adresses depuis les données ; ne plus importer `standardSchedule` inutilement. |
| `utils/menu.ts` | Supprimer « bois de hêtre » et « Pâtisserie américaine » (remplacés par les notes de §5.2). |
| `components/layout/MobileActionBar.tsx` | Lire le numéro depuis `useContent()` et non depuis `data/site`. |
| `components/sections/ContactForm.tsx` | Utiliser `texts.contact.successNote` ; liens `tel:` via une fonction commune. |
| `admin/config.ts` | Remplacer « 04 78 00 00 00 » par le numéro lu depuis les données (`site.phone`). |
| Liens `tel:` (`Footer`, `Info`, `MobileActionBar`, `ContactForm`) | Créer `utils/phone.ts` : `telHref("07 77 59 59 47") → "tel:+2250777595947"`, `whatsappHref(message?)`. Utiliser partout. |
| `utils/availability.ts` | Calculer jour/heure sur le fuseau `Africa/Abidjan` (`Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Abidjan", … })`), pas sur le navigateur. |
| `admin/ImagePicker.tsx`, `admin/MediaScreen.tsx` | Remplacer les exemples `brisket.jpg` par `ribs-o-ribs.jpg`. |
| `index.html` | Titre et meta description : « Texas GrillZ — Grill texan à Abidjan ». |

Ajouter un bouton **WhatsApp** (`whatsappHref("Bonjour, je souhaite réserver une table chez Texas GrillZ.")`) à côté de « Appeler » dans la barre mobile et dans la section Infos.

## 9. Hors périmètre (ne pas traiter maintenant)

Contenu par siège dans l'admin, ajout/suppression de plats, éditeur d'horaires, écran « Informations du restaurant », champs typés, historique, rôles, sécurité API. Ils sont décrits dans le cahier des charges.

## 10. ⚠️ Données déjà enregistrées côté backend

Le store lit `GET /api/content` et **ses valeurs écrasent `src/data`**. Si le backend contient déjà du contenu fictif (clés `menu`, `locations`, `site`, `hours`, `texts`, `historyTexts`, `testimonials`, `cravings`, `proofs`, `services`, `visuals`, `gallery`, `navLinks`, `locationHours`), le site continuera à afficher l'ancien contenu après tes changements.

1. Repère dans le backend (ou la base SQLite) où ces clés sont stockées.
2. Fournis un script `scripts/reset-content.*` qui sauvegarde d'abord l'existant dans un fichier daté, puis supprime ces clés pour que le site retombe sur `src/data`.
3. Ne l'exécute pas sans me le dire.

## 11. Vérifications finales

1. Recherche dans `src/` (hors commentaires) de : `Lyon`, `Villeurbanne`, `Caluire`, `Villette`, `04 78`, `texasgrill.fr`, `hêtre`, `Brisket`, `Pecan`, `Cornbread`, `Mac & Cheese`, `€`, `orders`, `4.9`, `1248` → **zéro résultat**.
2. Le site s'affiche avec le backend coupé.
3. Chaque prix apparaît sous la forme « 6 000 FCFA ».
4. Le statut Ouvert/Fermé est identique quel que soit le fuseau du navigateur.
5. La barre mobile appelle `+2250777595947` ; le bouton WhatsApp ouvre `wa.me/2250777595947`.
6. Liste-moi à la fin tous les `TODO(client)` créés, regroupés par fichier.
