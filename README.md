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

## Contrôles

```bash
npm run lint            # oxlint
npm run check:contrast  # contrastes WCAG AA de la palette de marque
npm run check:media     # chaque chemin /images, /videos existe-t-il sur le disque ?
```

`check:media` est le garde-fou des visuels : une vidéo référencée mais absente
fait échouer le contrôle, une photo absente est signalée sans faire échouer
(`FoodMedia` dessine alors une assiette de repli). Il repère aussi les photos
déposées dans `public/images/` mais jamais appelées par le code.

## Structure

```
src/
  components/
    common/   Loader, Lightbox (images + vidéos)
    layout/   Navbar, Footer, MobileActionBar, ProgressBar
    sections/ Hero, Cravings, Concept, Menu, Locations, Gallery, …
    pages/    HistoryPage
    ui/       FoodMedia, SectionHeading, Reveal, Button, …
  data/       site, menu, cravings, locations, hours, services, testimonials
  utils/      availability, menu, photoSlot, …
public/
  images/     photos réelles (produits, lieux, galerie) + replis SVG
  videos/     boucles de braise — voir public/videos/README.md
```

## Visuels

Les photos du restaurant sont déposées dans `public/images/` et prises en charge
de deux façons :

- **détection automatique** — un plat s'aperçoit dès que
  `public/images/products/<id>.jpg` existe (`utils/photoSlot.ts` +
  `ui/FoodMedia.tsx`), sans toucher au code ;
- **référence explicite** — les photos de salle sont déclarées dans
  `data/locations.ts`, la galerie est déclarée dans `sections/Gallery.tsx`.

Tant qu'un visuel manque, l'assiette dessinée en CSS prend le relais : jamais de
cadre vide. `scripts/place-photos.ps1` documente le mapping actuel des clichés
reçus du client.

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