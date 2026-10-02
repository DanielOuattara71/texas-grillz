# API Texas GrillZ — espace d'administration

Backend Node/Express + SQLite qui fournit deux choses au site :

1. **Une vraie connexion.** Un champ « mot de passe » posé sur une page
   statique ne protège rien (le JavaScript est envoyé à tout le monde). Ici, le
   mot de passe est vérifié **sur le serveur**, et l'accès à l'administration
   repose sur un cookie de session `httpOnly` — illisible depuis le JavaScript
   d'une page, donc invulnérable à une injection.
2. **Les réservations.** Le formulaire du site public enregistre enfin
   réellement les demandes (il simule un envoi, sans rien stocker).

## Medias

Les images déposées depuis l'onglet **Medias** de l'admin sont stockées hors du
dépôt Git et servies par l'API sous `/uploads/…`.

| Route | Rôle |
| --- | --- |
| `GET /api/admin/media` | Liste des images (dossier, nom, URL, taille). |
| `POST /api/admin/media/:folder` | Envoi (`multipart/form-data`, champ `file`). |
| `DELETE /api/admin/media?url=…` | Suppression. |

Dossiers acceptés : `products`, `gallery`, `locations`, `misc`. Formats : JPEG,
PNG, WebP, AVIF, 8 Mo maximum.

| Variable | Rôle |
| --- | --- |
| `UPLOAD_DIR` | Dossier de destination (par défaut `server/media`). |

**En production, ce dossier doit être sur le volume persistant** — sinon les
photos s'évaporent à chaque redéploiement, comme la base :

```
UPLOAD_DIR=/data/media
```

Sécurité de l'envoi : type MIME vérifié **puis** contenu relu octet par octet
(les marqueurs de début *et* de fin), nom de fichier régénéré côté serveur,
extension déduite du type, traversée de répertoire bloquée à la suppression.

## Tests

```bash
npm test              # 33 tests : format des données (titre, prix, URL d'image…)
node test/integration.cjs  # 15 tests : session, garde admin, CRUD, rate-limit
node test/e2e.cjs     # 9 tests : parcours complet visiteur → admin
node test/media.cjs   # 14 tests : dépôt d'images + cas hostiles
node test/lien-api.cjs # 7 tests : l'édition admin est-elle lue par le site ?
```

`format.test.cjs` vérifie le contrat de données : chaque champ obligatoire d'un
plat (titre, description, prix, URL d'image) est contrôlé, et le message
d'erreur nomme le champ fautif.

Le test de bout en bout démarre le serveur, dépose une réservation comme le
ferait un visiteur, se connecte avec le compte administrateur, vérifie que la
demande est visible, la marque confirmée et exporte le CSV.

`lien-api.cjs` ferme la boucle : l'admin écrit un prix dans l'API, on relit la
route publique et on vérifie que c'est ce prix-là que le site affiche — et que
la donnée survit au redémarrage du serveur.

## Démarrer en local

Deux terminaux : le backend d'un côté, le site de l'autre. Vite renvoie `/api`
vers `http://127.0.0.1:3001` (voir `vite.config.ts`), donc aucune variable
d'environnement n'est nécessaire côté front en développement.

```bash
# Terminal 1 — l'API
cd server
npm install
ADMIN_EMAIL=admin@exemple.fr ADMIN_PASSWORD=motdepasse-solide-123 npm start

# Terminal 2 — le site
npm run dev
```

Puis `http://localhost:3000/admin` pour l'espace d'administration.

## Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `ADMIN_EMAIL` | Adresse du premier administrateur. |
| `ADMIN_PASSWORD` | Son mot de passe (12 caractères minimum). |
| `ADMIN_NAME` | Nom affiché dans l'admin. |
| `PORT` | Port d'écoute (fourni par Railway/Render). |
| `DATABASE_PATH` | Emplacement du fichier SQLite. |
| `NODE_ENV` | `production` active le cookie `secure` (HTTPS obligatoire). |

> ⚠️ Le compte administrateur n'est créé **qu'au tout premier démarrage** et
> seulement si la base est vide. Redéployer ou modifier `ADMIN_PASSWORD` plus
> tard **ne** change **pas** le mot de passe existant. Pour le changer ensuite,
> passer par l'écran « Mon compte » de l'admin (route `POST /api/password`).

## API

### Public (sans session)

| Route | Rôle |
| --- | --- |
| `GET /api/health` | Sonde de santé (Railway/Render). |
| `GET /api/content` | Contenu éditable, un objet par bloc. |
| `POST /api/reservations` | Dépôt d'une demande de réservation. |

### Administration (session requise)

| Route | Rôle |
| --- | --- |
| `POST /api/login` | Connexion (10 tentatives / 15 min / IP). |
| `POST /api/logout` | Déconnexion ; la session est supprimée en base. |
| `GET /api/me` | État de la session au chargement de l'admin. |
| `POST /api/password` | Changement de mot de passe (invalide les autres sessions). |
| `GET /api/admin/content` | Contenu + date de dernière écriture. |
| `PUT /api/admin/content/:key` | Écriture d'un bloc (`menu`, `hours`, `site`…). |
| `GET /api/admin/reservations` | Réservations filtrées (statut, recherche, pagination). |
| `PATCH /api/admin/reservations/:id` | Change le statut d'une demande. |
| `GET /api/admin/reservations.csv` | Export CSV (séparateur `;`, BOM UTF-8 pour Excel FR). |

Blocs de contenu acceptés : `site`, `hours`, `menu`, `cravings`, `categories`,
`filters`, `locations`, `services`, `testimonials`, `proofs`, `texts`,
`historyTexts`, `visuals`, `gallery`. Toute autre clé est refusée (400).

## Sécurité en place

- Mots de passe **bcrypt** (coût 12) — jamais stockés en clair.
- Jeton de session **aléatoire 32 octets** en base, pas un JWT : révocable
  immédiatement, ce qu'un JWT ne permet pas.
- Cookie `httpOnly` + `sameSite=lax` (+ `secure` en production).
- Réponse **identique** pour « email inconnu » et « mot de passe faux », et
  hachage factice dans le premier cas : impossible d'énumérer les comptes ni
  de deviner par le temps de réponse.
- **Rate-limit** : 10 connexions / 15 min / IP, 5 réservations / heure / IP.
- `helmet` (en-têtes), limite de taille de corps (256 ko), validation `zod`
  sur toutes les entrées, requêtes SQL paramétrées partout.
- Erreurs 500 renvoyer un message générique : la pile d'appels ne fuite pas.

## Déployer sur Railway

```bash
npm install -g @railway/cli
railway login
railway init            # depuis le dossier server/
railway up
```

Puis, dans le tableau de bord Railway :

1. **Variables** : ajouter `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12 caractères
   minimum), `ADMIN_NAME`, `NODE_ENV=production`.
2. **Volume** : monter un volume sur `/data` et mettre `DATABASE_PATH=/data/tg.sqlite`.
   **Sans volume, toutes les données sont perdues à chaque redéploiement** —
   c'est le piège le plus courant de ce type d'hébergement.
3. Générer un domaine public depuis **Settings → Networking**.

## Déployer sur Render

1. Nouveau *Web Service* →Root Directory : `server`.
2. Build Command : `npm ci --omit=dev` — Start Command : `npm start`.
3. Ajouter les mêmes variables d'environnement.
4. **Disques** : monter un disque sur `/data` avec `DATABASE_PATH=/data/tg.sqlite`.

Les deux hébergeurs lisent le `Dockerfile` fourni ; `PORT` est injecté
automatiquement.
