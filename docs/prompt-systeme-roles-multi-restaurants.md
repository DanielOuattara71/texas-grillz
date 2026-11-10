# PROMPT 2 — Système à trois rôles : super admin, admin par restaurant, développeur

> À exécuter **après** le prompt de remplacement du contenu (`prompt-remplacement-contenu-texas-grillz.md`), dans le même dépôt. Il part du code existant ; il ne repart pas de zéro.

---

## 0. Rôle, objectif et ordre de travail

Tu es développeur senior full-stack. Le projet est un site vitrine React/TypeScript (Vite) avec une administration sous `/admin` et une API (cookie de session httpOnly, `credentials: "include"`).

**Le modèle métier voulu** (validé par le propriétaire) :

| Rôle | Qui | Ce qu'il fait |
|---|---|---|
| `super_admin` | Le propriétaire de l'enseigne Texas GrillZ | Crée les restaurants (adresses) et **crée les comptes admin**, chacun rattaché à **un seul** restaurant. Gère aussi le contenu commun de la marque. Voit tout. |
| `admin` | Le gérant d'**un** restaurant Texas GrillZ | Enregistre **les horaires** et **le menu** de son restaurant, gère **les réservations** de son restaurant. Rien d'autre. |
| `developer` | L'équipe technique | Accès technique de maintenance à tous les restaurants (lecture, correction de contenu, journal). Ne gère ni les comptes ni les restaurants. |

Procède **dans cet ordre**, en t'arrêtant après l'étape 1 pour me montrer le résultat :

1. **Étape 0 — Localiser le backend.** Il n'est pas dans `src/`. Cherche-le dans le dépôt parent ou un dossier voisin (`server/`, `api/`, `backend/`). S'il est introuvable, dis-le-moi et produis à la place une spécification d'API complète (§5) plus un squelette ; n'invente pas son comportement actuel.
2. **Étape 1 — Rapport.** Pour chaque point du §3, confirme ou infirme avec le fichier et la ligne. Liste les routes existantes et ce qu'elles vérifient aujourd'hui côté serveur.
3. **Étapes 2 à 6** — implémentation par phases (§7), un commit par phase.

## 1. Règles impératives

1. **La sécurité se joue côté serveur.** Rôle et restaurant viennent **toujours de la session**, jamais d'un paramètre de requête, d'un corps JSON ou d'un champ caché. Masquer un onglet ne protège rien.
2. Un `admin` sans `location_id` **ne doit jamais** pouvoir éditer le contenu global (voir défaut D1).
3. Le site public ne dépend jamais de l'API : en cas d'échec, il retombe sur `src/data` (comportement existant à conserver et à tester).
4. Pas de nouvelle dépendance lourde. Le projet n'a pas de routeur ; garde `pushState`.
5. Textes de l'interface d'administration en français, sans jargon.
6. Ne casse pas les clés de contenu existantes (`menu`, `hours`, `texts`…) : elles deviennent le **contenu commun / modèle**.
7. `npx tsc --noEmit` et `npm run build` passent à chaque phase.

## 2. Ce qui existe déjà (à réutiliser, ne pas refaire)

- `AdminUser` contient déjà `role?` et `location_id?` (`admin/api.ts`). La session est un cookie httpOnly (`SessionContext`).
- `AdminShell` traite `super_admin` et `developer` comme « privilégiés » (`isPrivileged`) : eux seuls voient le sélecteur de restaurant et « Supprimer ce siège ». Un compte non privilégié reçoit `location_id` comme restaurant courant.
- Les écrans écrivent déjà sous des clés `<locationId>:<bloc>` (`<id>:menu`, `<id>:hours`, `<id>:texts`, `<id>:visuals`, `<id>:gallery`) via `api.saveContent`.
- `ReservationsScreen` filtre déjà par restaurant (`location`), le formulaire public envoie déjà `locationId`.
- `AccountScreen` : changement de mot de passe (12 caractères minimum, ferme les autres sessions).
- `api.deleteLocationContent(id)` et `api.media()` / `uploadMedia()` / `deleteMedia()`.

## 3. Écarts constatés entre le modèle voulu et le code

À confirmer à l'étape 1, puis à corriger.

| # | Écart | Où |
|---|---|---|
| D1 | **Un admin sans `location_id` (ou avant l'exécution de l'effet) édite le contenu GLOBAL**, car `locationId` vaut `null` et la clé devient `menu`. | `AdminApp.tsx` (`useState<string \| null>(null)` puis `useEffect`) |
| D2 | **Le site public ne lit jamais `<id>:menu` ni `<id>:hours`.** Le gérant enregistre, rien n'apparaît sur le site. | `content/store.tsx` (`mergeContent` ne lit que les blocs globaux) |
| D3 | **Aucune gestion des comptes** : pas d'écran ni de route pour créer, modifier, désactiver un admin, l'affecter à un restaurant ou réinitialiser son mot de passe. | `admin/api.ts`, `AdminApp.TABS` |
| D4 | **Aucun CRUD de restaurant.** La liste vient de `data/locations.ts`, statique ; le sélecteur aussi. Un restaurant créé par le propriétaire n'apparaîtrait nulle part. | `AdminApp.tsx`, `ContentScreen` (pas d'ajout/suppression) |
| D5 | **Tous les onglets sont visibles par tous les rôles** (Textes, Visuels, Adresses, Avis…). Le gérant ne devrait voir que Réservations, Carte, Photos des plats, Horaires, Médias de son restaurant, Mon compte. | `AdminApp.TABS` |
| D6 | **Nouveau restaurant = menu fictif.** Quand `<id>:menu` est vide, l'admin retombe sur `deliveredMenu` (données statiques) et non sur le menu commun. | `DishPhotosScreen.tsx` |
| D7 | **L'export CSV ne transmet pas le restaurant** : `reservationsCsvUrl` ne passe que `status` et `q`. Risque d'export de toutes les réservations. | `admin/api.ts` |
| D8 | **Médias partagés** : un seul dossier `products` pour tous ; un gérant peut supprimer les images d'un autre. | `MediaScreen.tsx`, `api.deleteMedia` |
| D9 | Le rôle `developer` est traité exactement comme `super_admin` (suppression comprise). | `AdminApp.tsx` |
| D10 | L'API est appelée avec un `location` choisi par le client : à vérifier que le serveur l'ignore pour un `admin`. | `ReservationsScreen`, `api.reservations` |
| D11 | Aucun journal des modifications (qui a changé quoi, quand). | — |

## 4. Matrice des droits (source de vérité, à appliquer côté serveur ET interface)

| Action | super_admin | admin (son restaurant) | developer |
|---|---|---|---|
| Créer / modifier / désactiver / supprimer un compte admin ou developer | ✅ | ❌ | ❌ |
| Réinitialiser le mot de passe d'un admin | ✅ | ❌ | ❌ |
| Créer / modifier / supprimer un restaurant (nom, adresse, téléphone, photo, statut) | ✅ | ❌ | ❌ |
| Contenu commun : textes, histoire, visuels, galerie, infos du restaurant, services, avis | ✅ | ❌ | ✅ (correction) |
| Menu de son restaurant (`<id>:menu`) | ✅ (tous) | ✅ (le sien) | ✅ (tous) |
| Horaires de son restaurant (`<id>:hours`) | ✅ (tous) | ✅ (les siens) | ✅ (tous) |
| Photos des plats de son restaurant | ✅ | ✅ | ✅ |
| Réservations : voir, changer le statut, exporter | ✅ (tous, filtre par restaurant) | ✅ (son restaurant uniquement) | ✅ lecture seule |
| Médias | ✅ tous | ✅ son dossier uniquement | ✅ lecture |
| Journal des modifications | ✅ | ❌ | ✅ |
| Changer son propre mot de passe | ✅ | ✅ | ✅ |

`// TODO(client): confirmer le périmètre exact du rôle developer et si un admin peut modifier le téléphone de son restaurant.`

## 5. Spécification de l'API (à implémenter ou à vérifier)

**Données** :
- `users` : `id`, `email` (unique), `name`, `role` (`super_admin` | `admin` | `developer`), `location_id` (obligatoire si `admin`, nul sinon), `active`, `must_change_password`, `created_by`, `created_at`, `last_login_at`.
- Restaurants : conserver le bloc de contenu `locations`, mais **modifié uniquement par des routes dédiées** qui garantissent l'unicité et l'immutabilité de l'`id` (slug).
- Contenu : clés globales (`site`, `texts`, `locations`…) et clés par restaurant `<id>:menu`, `<id>:hours`.
- `audit_log` : `id`, `user_id`, `action`, `key`, `location_id`, `at`, `summary` (jamais de mots de passe).

**Routes** (toutes derivent rôle et restaurant de la session) :

| Route | Règle |
|---|---|
| `GET /api/content` (public) | Renvoie les blocs globaux **et** `byLocation: { "<id>": { menu?, hours? } }` pour les restaurants actifs. |
| `PUT /api/admin/content/:key` | `super_admin`/`developer` : toute clé valide. `admin` : **uniquement** `<son location_id>:menu` et `<son location_id>:hours` ; sinon `403`. Validation de schéma avant écriture. |
| `GET /api/admin/reservations`, `PATCH …/:id`, `GET …/reservations.csv` | `admin` : filtre forcé sur son `location_id`, paramètre `location` ignoré. `super_admin` : filtre libre. Le CSV applique le même filtre. |
| `POST /api/reservations` (public) | `locationId` doit exister et être actif ; stocker `location_id`. Limiter le débit. |
| `GET/POST /api/admin/users`, `PATCH/DELETE /api/admin/users/:id`, `POST /api/admin/users/:id/reset-password` | `super_admin` uniquement. Impossible de supprimer ou rétrograder le dernier `super_admin`. Mot de passe temporaire affiché **une seule fois**, `must_change_password = true`. Désactiver un compte ferme ses sessions. |
| `GET/POST/PATCH/DELETE /api/admin/locations` | `super_admin` uniquement. À la création : copie du `menu` commun vers `<id>:menu` et des horaires par défaut vers `<id>:hours`. La suppression est refusée tant qu'un admin y est rattaché. |
| `POST /api/admin/media/:folder`, `DELETE /api/admin/media` | `admin` : dossier `locations/<son id>` uniquement. |
| `GET /api/admin/audit` | `super_admin`, `developer`. |
| `POST /api/login`, `/api/logout`, `/api/me`, `/api/password` | Existants. `/api/me` renvoie aussi `location` (nom du restaurant) et `must_change_password`. |

Sécurité à vérifier ou ajouter : CORS limité au domaine du site, cookies `Secure` + `HttpOnly` + `SameSite`, protection CSRF sur `PUT/PATCH/DELETE/POST`, limitation des tentatives de connexion, type et taille des fichiers téléversés, journalisation des échecs.

## 6. Interface d'administration (partir de l'existant)

1. **Rôles et onglets.** Créer `admin/permissions.ts` : une table `rôle → onglets autorisés` et un helper `can(user, action)`. Remplacer `isPrivileged`. Onglets :
   - `admin` : Réservations, Carte, Photos des plats, Horaires, Médias, Mon compte.
   - `super_admin` : tout, plus **Restaurants** et **Équipe** (nouveaux).
   - `developer` : tout sauf Restaurants et Équipe, plus **Journal**.
2. **Correction de D1.** Pour un `admin`, calculer `locationId` **de façon synchrone** à partir de `user.location_id` (valeur initiale, pas d'effet). Si `location_id` est absent : écran bloquant « Votre compte n'est rattaché à aucun restaurant. Contactez le propriétaire. », aucun écran d'édition.
3. **En-tête** : afficher le nom et le rôle, et pour un admin le **nom du restaurant** (non modifiable). Le sélecteur de restaurant (super admin, developer) se construit depuis `useContent().locations`, plus depuis `data/locations`.
4. **Onglet Équipe** (super_admin) : liste (nom, email, rôle, restaurant, actif, dernière connexion), formulaire de création (email, nom, rôle, restaurant obligatoire pour un admin), désactiver/réactiver, changer de restaurant, réinitialiser le mot de passe, supprimer avec confirmation.
5. **Onglet Restaurants** (super_admin) : ajouter, modifier, désactiver. À la création, proposer « Créer le compte admin de ce restaurant » dans la foulée.
6. **Carte** : ajout, suppression, réordonnancement, duplication de plats (résout aussi l'écart C2 de l'audit) ; catégories en liste déroulante ; prix entier FCFA. Bouton **« Copier la carte d'un autre restaurant »**. Corriger D6 : le repli est le menu commun, jamais `deliveredMenu`.
7. **Horaires** : éditeur dédié 7 jours nommés (lundi à dimanche), ouvert/fermé, ouverture, fermeture, avec « copier sur tous les jours » et « copier depuis un autre restaurant ». Remplace l'affichage `#1…#7`. Enregistre sous `<id>:hours`.
8. **Réservations** : colonne et filtre « restaurant » (super admin) ; l'admin ne voit que le sien ; export CSV avec le même filtre (D7) ; compteur de nouvelles demandes ; bouton « Répondre sur WhatsApp » (`wa.me/<téléphone>`).
9. **Médias** : l'admin ne voit et ne modifie que `locations/<son id>` (D8).
10. **Premier accès** : si `must_change_password`, rediriger vers « Mon compte » et bloquer le reste.
11. **Journal** (super_admin, developer) : liste filtrable des modifications.

## 7. Site public : lire le contenu par restaurant (corrige D2)

1. `content/store.tsx` : lire `byLocation` et exposer `menuByLocation[id]` et `hoursByLocation[id]`. Chaîne de repli : contenu du restaurant → contenu commun → `src/data`. Valider les formes (liste de plats, 7 jours) avant de les accepter.
2. **Section Carte** : sélecteur de restaurant (onglets) au-dessus de la carte ; choix conservé dans l'URL (`?lieu=zone-4`). La carte, les prix et les « envies » (`cravings`) se résolvent sur le menu du restaurant choisi ; une envie sans plat correspondant est ignorée.
3. **Section Lieux** : chaque carte affiche **ses** horaires et la pastille « ouvert / fermé » calculée depuis `<id>:hours`, avec un lien « Voir la carte de ce restaurant ».
4. **Section Infos et pied de page** : lister chaque restaurant (adresse, téléphone, horaires) au lieu d'un horaire unique.
5. **Formulaire de réservation** : le restaurant choisi détermine `locationId` ; refuser l'envoi vers un restaurant inactif.
6. Ne montrer que les restaurants dont le statut est actif.

## 8. Phases et critères d'acceptation

| Phase | Contenu | Critère |
|---|---|---|
| 1 | Étapes 0–1, rapport, correction de D1 | Un compte `admin` sans restaurant ne peut rien éditer ; vérifié par test |
| 2 | Backend : droits, scoping des clés, réservations et CSV, médias (§5) | Avec un cookie admin du restaurant A, `PUT /api/admin/content/B:menu` répond `403`, `GET …/reservations?location=B` ne renvoie que A, le CSV aussi |
| 3 | Comptes et restaurants (§5, §6.4–6.5, D3, D4) | Le super admin crée un restaurant puis son admin ; l'admin se connecte, change son mot de passe, ne voit que son restaurant |
| 4 | Menu, horaires, médias, réservations côté admin (§6.6–6.9) | L'admin ajoute un plat, modifie ses horaires, traite une réservation |
| 5 | Site public par restaurant (§7) | Le changement fait par l'admin de A apparaît sur le site pour A seulement ; API coupée → le site s'affiche avec `src/data` |
| 6 | Journal, tests, documentation | Chaque écriture est journalisée ; guide d'utilisation de 2 pages par rôle |

Tests automatisés à écrire : matrice des droits (un test par ligne et par rôle), fusion de contenu avec données invalides, calcul du statut d'ouverture, scoping des réservations et du CSV.

## 9. Migration et amorçage

- Aucun compte n'est créé par l'interface au départ : fournir `scripts/create-super-admin.*` (email et mot de passe lus dans l'environnement, jamais dans le code).
- Migration des données : créer les restaurants définis par le prompt 1 (`zone-4`, `riviera-jardin`, `deux-plateaux-latrille`, `yopougon-maroc`, `cocody-cite-des-arts`), copier le menu commun vers chaque `<id>:menu`, copier les horaires vers chaque `<id>:hours`. Sauvegarde préalable de la base.
- Les contenus enregistrés avant migration sous les clés fictives sont purgés comme décrit au §10 du prompt 1.

## 10. À me rendre à la fin

1. Le rapport de l'étape 1 (écarts confirmés ou non, routes et vérifications existantes).
2. La liste des fichiers modifiés par phase.
3. Les résultats des tests, y compris les `403` attendus.
4. Les `TODO(client)` restants, regroupés.
