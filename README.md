# Texas GrillZ — site vitrine

Site one-page du restaurant Texas GrillZ (Lyon 3ᵉ, Lyon 7ᵉ, Villeurbanne,
Caluire en projet). React 19 + TypeScript + Vite 8 + Tailwind CSS 4, sans
framework UI ni librairie de composants : tout est dans `src/components`.

## Démarrer

```bash
npm install
npm run dev        # serveur de développement
npm run build      # tsc -b puis build Vite (sortie dans dist/)
npm run preview    # sert dist/ en local
```

## Format de données

Le contenu modifiable est validé **côté serveur** avant toute écriture
(`server/src/schemas.js`) : un plat sans titre, avec un prix négatif ou une URL
qui n'est pas une image est refusé, au lieu d'être enregistré et de casser
l'affichage du site public. Le message d'erreur nomme le champ fautif.

### Un plat de la carte

Chaque entrée du bloc `menu` a cette forme :

```json
{
  "id": "brisket",
  "name": "Brisket Fumé",
  "description": "Poitrine de bœuf fumée 12h au bois de hêtre",
  "price": 24,
  "category": "viandes",
  "badge": "signature",
  "image": "/uploads/products/brisket-abc123.jpg",
  "orders": 412
}
```

| Champ | Type | Règle |
| --- | --- | --- |
| `id` | texte | lettres, chiffres, tirets — sert de clé et de nom d'emplacement photo |
| `name` | texte | **titre du plat**, 1 à 120 caractères |
| `description` | texte | 1 à 400 caractères |
| `price` | nombre | 0 à 999, deux décimales |
| `category` | énum | `viandes`, `accompagnements`, `desserts` |
| `badge` | énum, optionnel | `signature`, `best-seller`, `nouveau` |
| `image` | texte | **URL de l'image** — voir ci-dessous |
| `orders` | nombre | commandes du mois, pour le classement |

### URL d'image

| Forme | Exemple | Origine |
| --- | --- | --- |
| `/uploads/…` | `/uploads/products/brisket-abc.jpg` | photo déposée depuis l'admin |
| `/images/…` | `/images/products/brisket.jpg` | photo livrée avec le dépôt |
| `https://…` | `https://cdn.exemple.fr/x.webp` | hébergée ailleurs (CDN, bucket) |
| `""` | *(vide)* | aucune photo : le site dessine une assiette |

Extensions acceptées : `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif` (`.svg` aussi
pour `/images/`). Un chemin relatif comme `brisket.jpg` est refusé : il ne
mènerait nulle part.

Le même format s'applique aux blocs `locations`, `testimonials`, `services` et
`site`. Schémas complets : `server/src/schemas.js`.

## Contenu : le site lit le backend

Le site ne lit plus ses données uniquement dans `src/data/*.ts` : au démarrage,
`src/content/store.tsx` appelle `GET /api/content` et applique le résultat bloc
par bloc (carte, envies, sites, services, avis, chiffres, horaires,
coordonnées, navigation). Ce que tu modifies dans l'admin apparaît donc sur le
site public.

**Le site ne dépend jamais du backend.** Si l'appel échoue — API éteinte,
hors ligne, premier démarrage après déploiement — le store conserve les données
livrées avec le dépôt, silencieusement. Un visiteur voit toujours un site
complet. Seul l'espace d'administration exige le serveur.

### Contenu par siège (branche)

Un restaurant peut ouvrir plusieurs sièges (`lyon-3`, `lyon-7`, …). Chaque
bloc peut alors être édité globalement (`menu`) ou par siège
(`<locationId>:<base>`, ex. `lyon-3:menu`) :

- `PUT /api/admin/content/:key` accepte une clé préfixée par un siège.
- `GET /api/content?location=<locationId>` renvoie le contenu du siège : les
  blocs du siège en vigueur, avec la surcharge du siège qui prime sur le contenu
  global. Les horaires du siège sont rattachés via `locationHours`.
- L'espace admin expose un sélecteur de siège pour le super admin / développeur ;
  l'admin par siège n'édit que le sien.
- `DELETE /api/admin/locations/:locationId/content` supprime tous les blocs du
  siège (super admin / développeur). Le contenu global est préservé.


Les envies sont le cas délicat : elles référencent un plat par son `id` et
héritent de son nom et de son prix. Elles sont donc toujours résolues sur la
carte réellement affichée ; un plat supprimé écarte l'envie qui pointait dessus
sans faire échouer le rendu.

## Contrôles

```bash
npm run lint            # oxlint
npm run check:contrast  # contrastes WCAG AA de la palette de marque
npm run check:media     # chaque chemin /images, /videos existe-t-il sur le disque ?
npm run test:admin      # l'écran de connexion se rend sans erreur de contexte
npm run test:content    # le site lit bien ce que l'admin écrit
npm run test:photos     # une photo déposée atteint bien son plat
cd server && npm test   # 45 tests de l'API (session, CRUD, médias, liaison)
```

`check:media` est le garde-fou des visuels : une vidéo référencée mais absente
fait échouer le contrôle, une photo absente est signalée sans faire échouer
(`FoodMedia` dessine alors une assiette de repli). Il repère aussi les photos
déposées dans `public/images/` mais jamais appelées par le code.

## Espace d'administration

L'administration est à `/admin`, dans le même projet (un seul déploiement). Elle
est **chargée à la demande** : un visiteur ne télécharge jamais son code.

Elle exige un vrai serveur : un champ « mot de passe » posé sur une page
statique ne protège rien, puisque le JavaScript est envoyé à tout le monde.
Le backend (`server/`) vérifie le mot de passe côté serveur (bcrypt) et délivre
un cookie de session `httpOnly`, illisible depuis le JavaScript. Détails,
variables d'environnement et déploiement : **`server/README.md`**.

```bash
# Terminal 1 — l'API
cd server && npm install
ADMIN_EMAIL=admin@exemple.fr ADMIN_PASSWORD=motdepasse-solide-123 npm start

# Terminal 2 — le site (Vite renvoie /api vers le serveur local)
npm run dev
# → http://localhost:3000/admin
```

Écrans disponibles : réservations (suivi + export CSV), carte, **photos des
plats**, **medias** (dépôt et suppression), horaires, adresses, avis, **textes du
site**, **visuels du site**, et changement du mot de passe.

## Structure

```
src/
  components/
    common/   Loader, Lightbox (images + vidéos)
    layout/   Navbar, Footer, MobileActionBar, ProgressBar
    sections/ Hero, Cravings, Concept, Menu, Locations, Gallery, …
    pages/    HistoryPage
    ui/       FoodMedia, SectionHeading, Reveal, Button, …
  admin/      espace d'administration (chargé seulement sur /admin)
    api.ts        client HTTP (cookie de session)
    SessionContext.tsx  état de connexion
    LoginScreen.tsx    écran de connexion
    ReservationsScreen.tsx  suivi des réservations + export CSV
    MediaScreen.tsx  dépôt et suppression de photos
    ImagePicker.tsx  sélecteur d'image (bibliothèque + envoi direct)
    DishPhotosScreen.tsx  photo manquante par plat, dépôt sur la fiche
    ContentScreen.tsx  éditeur de contenu (carte, horaires, sites, avis…)
    AccountScreen.tsx  changement de mot de passe
  data/       site, menu, cravings, locations, hours, services, testimonials
  utils/      availability, menu, photoSlot, …
server/       API Express + SQLite (authentification, contenu, réservations)
public/
  images/     photos réelles (produits, lieux, galerie) + replis SVG
  videos/     boucles de braise — voir public/videos/README.md
```

## Architecture

`ContentProvider` enveloppe les trois routes (accueil, page Histoire, `/admin`).
Les écrans d'administration lisent le contenu via `useContent()` : sans provider,
`useContent` **lève une erreur** au lieu de renvoyer les données livrées. Le repli
sur `src/data` ne concerne que l'API injoignable, pas un provider manquant — sinon
l'admin enregistrerait par-dessus les modifications déjà faites.

## Visuels

Les photos viennent de deux endroits, et le site les affiche de la même façon :

- `/images/…` — photos livrées avec le dépôt (`public/images/`) ;
- `/uploads/…` — photos déposées depuis l'espace d'administration, servies par
  l'API. Quand celle-ci est sur un autre domaine, `VITE_API_URL` est ajouté à
  l'adresse (`utils/photoSlot.ts`). En développement, Vite renvoie `/uploads` au
  serveur local comme `/api` (`vite.config.ts`), sans quoi les photos déposées
  s'afficheraient en 404.

### Associer une photo à un plat

Onglet **Photos des plats** de l'admin : chaque plat y est listé avec une
pastille (● photo présente, ○ absente). Pour un plat sans photo, on dépose le
fichier directement depuis la fiche, ou on choisit une image déjà déposée ou
livrée avec le site. La sélection est alors écrite dans la carte, et le site
l'affiche aussitôt.

Un plat sans photo ne casse rien — `FoodMedia` dessine une assiette à la place —
mais l'écran le signale : c'est la partie du site qui donne le plus envie, et
une photo par plat vaut mieux qu'aucune.

Le champ `image` d'une fiche s'édite avec ce même sélecteur dans l'onglet
**Carte** et **Adresses**.

### Les autres visuels du site

Onglet **Visuels du site**, en deux panneaux :

- **Emplacements** — logo (barre de navigation, pied de page), hero, smoker
  (section Concept), et les trois photos de la page Histoire. Chacun a son
  sélecteur et son texte alternatif. Le logo se change une seule fois : il
  apparaît à trois endroits du site, tous alimentés par la même valeur.
- **Galerie** — chaque vignette se réordonne (↑ ↓), se remplace, se retire, et
  une nouvelle s'ajoute. Les boucles vidéo se choisissent dans la liste des 6
  livrées ; les déposer depuis l'admin n'est pas proposé (66 Mo passeraient
  par Git).

Le hero et le smoker jouent leur boucle vidéo tant qu'aucune photo ne leur est
associée : le mouvement de braise de l'accueil est préservé par défaut.

### Les textes du site

Onglet **Textes du site** : les accroches qui étaient écrites directement dans
les composants sont désormais dans `src/data/texts.ts` et se modifient ici, sans
toucher au code.

- **Sections** — une carte par section (hero, bandeau de preuve, Ça fume, Concept,
  Signatures, Carte, Lieux, Galerie, Avis, Infos, Réservation, navigation). Chacune
  expose la pastille numérotée, le sur-titre, le titre, l'accent en italique et
  l'accroche.
- **Page Histoire** — les deux chapitres (sur-titre, titre en deux parties,
  paragraphes) et la citation du fondateur. Un paragraphe par ligne ; une ligne
  vide démarre un nouveau paragraphe.

Le serveur refuse une valeur qui casserait le rendu — un objet là où un titre est
attendu afficherait « [object Object] » dans un `<h1>`. L'enregistrement est fait
par blocs complets : **évite d'ouvrir deux onglets admin en même temps** sur cet
écran, sinon le second écrase le premier.

Le numéro de téléphone affiché dans le message d'erreur du formulaire suit la
même source de vérité que le reste du site : le changer dans l'onglet
**Coordonnées** le met à jour partout.

Emplacements historiques, conservés pour les photos livrées : un plat s'aperçoit
aussi dès que `public/images/products/<id>.jpg` existe (`utils/photoSlot.ts` +
`ui/FoodMedia.tsx`), sans toucher au code.

## Boucles vidéo

Les MP4 (66 Mo au total) ne sont pas versionnés dans Git : voir
`public/videos/README.md` pour les réencoder et les réapprovisionner.

## Outillage

- `scripts/place-photos.ps1` — dépôt des photos optimisées à leur emplacement.
- `scripts/check-contrast.mjs`, `scripts/check-media.mjs` — contrôles ci-dessus.
- `scripts/normalize-eol.mjs` — fins de ligne CRLF/LF (projet travaillé depuis
  WSL et Windows ; `.gitattributes` force LF).
## Commits

Message en français, décrivant l'effet visible par le client plutôt que
l'implémentation. Exemple : « Identité affichée + appétit : section Envies,
About refondu, visuels de plats auto-détectés ».