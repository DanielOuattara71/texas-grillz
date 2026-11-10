# Texas GrillZ — AGENTS.md

Site one-page React 19 + TypeScript + Vite 8 + Tailwind 4 (front) + API Express +
SQLite (admin / réservations). Contenu en français. Repo composé de **deux projets
npm séparés** (racine + `server/`), sans workspaces.

## Commandes

```bash
npm install          # terminal racine (front)
cd server && npm install   # terminal serveur (API)

npm run dev          # Vite → http://localhost:3000 (port 3000 strict, host 0.0.0.0)
npm run build        # tsc -b && vite build → sortie dans dist/ (c'est aussi le typecheck)
npm run lint         # oxlint (config .oxlintrc.json)
npm run check:contrast   # scripts/check-contrast.mjs (contrastes WCAG AA palette)
npm run check:media     # scripts/check-media.mjs (chemins /images, /videos)

npm run test:admin      # vite-node test/admin-render.tsx
npm run test:content    # vite-node test/content-link.tsx
npm run test:photos     # vite-node test/photo-chain.tsx
npm run test:visuals    # vite-node test/site-visuals.tsx
```

- Tests front : **pas de test runner** (pas vitest/jest) — `vite-node` + rendu
  `react-dom/server` (`renderToString`). Chaque script sort non-zéro en cas
  d'échec. Un seul test : `npx vite-node test/<fichier>.tsx`.
- Tests back : `cd server && npm test` (chaîne 5 fichiers : format, integration,
  e2e, media, lien-api). Chacun peut être lancé seul (`node test/<fichier>.cjs`).
- **Pas de script `test` racine** et **pas de typecheck séparé** : `npm run build`
  exécute `tsc -b` (project references tsconfig.app.json / tsconfig.node.json).

## Architecture (faits non évidents)

- Contenu éditable : `src/content/store.tsx` (`ContentProvider`) appelle
  `GET /api/content` au démarrage et fusionne les blocs par clé profonde.
  Sans backend, il retombe silencieusement sur `src/data/*` livrées au dépôt.
  **Sans `<ContentProvider>`, `useContent()` lève une erreur** — ne pas le
  contourner.
- L'admin s'écrit par blocs complets via `PUT /api/admin/content/:key` ; le
  serveur refuse toute clé inconnue (400). **Ne pas ouvrir deux onglets admin en
  même temps sur l'écran Textes/Content** : l'écriture écrase la précédente.
- Les envies (`cravings`) référencent un plat par `menuId` et héritent de son nom
  et prix ; elles sont résolues sur la carte réellement affichée.
- L'admin est lazy-loadé (`React.lazy` dans `src/App.tsx`) mais reste enveloppé du
  `ContentProvider`.
- Deux sources de médias : `/images/…` (photos livrées, `public/images/`, avec
  repli SVG→JPG via `utils/photoSlot.ts`) et `/uploads/…` (dépôt admin, servi par
  l'API). En prod, `/uploads` doit être préfixé par `VITE_API_URL`
  (`utils/photoSlot.ts`). En dev, Vite proxy `/api` et `/uploads` → `127.0.0.1:3001`.

## Développement local

- Terminal 1 — API : `cd server && npm start` (port 3001 par défaut). Variables :
  `ADMIN_EMAIL`, `ADMIN_PASSWORD` (≥12 car), `ADMIN_NAME`, `NODE_ENV`,
  `DATABASE_PATH`, `UPLOAD_DIR`, `PORT`.
- Terminal 2 — site : `npm run dev` → `/admin` sur `http://localhost:3000/admin`.
- En prod les médias uploadés partent sur un volume persistant (`/data`), sinon
  ils disparaissent au redéploiement ; idem pour la base SQLite.

## Pièges

- En dev, le backend doit tourner (port 3001) pour que l'admin et les photos
  fonctionnent ; sans proxy, les photos `/uploads` seraient en 404.
- L'admin est créé **uniquement au premier boot** avec une base vide ; changer
  `ADMIN_PASSWORD` ensuite n'a aucun effet (passer par `POST /api/password`).
- Rate-limit : 10 logins / 15 min / IP, 5 réservations / heure / IP.
- Suppression d'un média : le backend retire aussi les références dans les blocs
  de contenu (`menu`, `visuals`, `gallery`) — une photo supprimée ne doit pas
  rester référencée dans le JSON stocké.
- Erreurs API : messages génériques en 500 (pas de fuite de stack côté client) ;
  réponses identiques pour email inconnu / mot de passe faux.
- `.gitattributes` force LF ; `scripts/normalize-eol.mjs` pour WSL/Windows.
- MP4 de la galerie (66 Mo) **non versionnés** — voir `public/videos/README.md`.
- Réservations : `locationId` **obligatoire** côté API (`POST /api/reservations`) ;
  admin par siège (scoping `req.user.location_id`), super admin / developpeur voient
  tout et filtrent via `?location=`.
- Contenu : global (`menu`) ou par siège (`<locationId>:<base>`, ex. `lyon-3:menu`) ;
  lecture publique par siège : `GET /api/content?location=<locationId>` (contenu
  global avec surcharge du siège) ; suppression du contenu d'un siège :
  `DELETE /api/admin/locations/:locationId/content` (super admin / developpeur
  requis) ; l'admin par siège n'édit que le sien.
- Ecrans admin par siège : le sélecteur super admin (contenu global / un siège)
  remonte `locationId` vers Carte, Photos des plats, Visuels, Visuels+Galerie,
  Textes ; les écrans concernés lisent/écrivent `<locationId>:<base>`.
- Bootstrap admin : role `developer` (super super admin = le développeur) ; roles
  `super_admin` / `developer` pour les super admins.
- Vérifications avant de considérer un changement fait : `npm run lint` →
  `npm run build` → tests front (`npm run test:*`) ; `cd server && npm test` pour
  l'API.

## Conventions

- Messages de commit en français, décrivant l'effet visible côté client (pas
  l'implémentation).
- Contrôles dédiés : `check:contrast` (palette WCAG AA) et `check:media` (chaque
  média référencé existe ; les photos orphelines dans `public/images/` sont
  signalées sans fail).
