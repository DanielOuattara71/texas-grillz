/**
 * Contrôle des visuels référencés.
 *   node scripts/check-media.mjs
 *
 * Les photos du restaurant sont déposées dans `public/images/` et référencées
 * en dur (`data/locations.ts`, `sections/Gallery.tsx`, `pages/HistoryPage.tsx`)
 * ou détectées toute seules (`utils/photoSlot.ts` + `ui/FoodMedia.tsx`).
 * Ce script vérifie trois choses :
 *   1. tout chemin référencé existe (une vidéo absente = écran noir : ÉCHEC) ;
 *   2. une photo absente reste un emplacement vide assumé (FoodMedia dessine
 *      une assiette) : signalé, sans faire échouer la contrôle ;
 *   3. une photo présente dans `public/images/` mais référencée nulle part est
 *      un tirage client oublié : signalé.
 * Sortie ≠ 0 seulement dans le cas 1 (vidéo).
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const SRC = join(root, "src");
const PUBLIC_IMAGES = join(root, "public", "images");

/** Chemins absolus → chemins publics (`/images/gallery/1.jpg`). */
function publicFiles() {
  const out = [];
  const stack = [["images", PUBLIC_IMAGES]];
  while (stack.length) {
    const [prefix, dir] = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) stack.push([`${prefix}/${entry.name}`, join(dir, entry.name)]);
      else out.push(`/${prefix}/${entry.name}`);
    }
  }
  return out;
}

/** Chemins `/images/…` ou `/videos/…` écrits en dur dans le code. */
function referencedPaths() {
  const found = new Set();
  const pattern = /["'`](\/(?:images|videos)\/[^"'`\n]+?\.(?:jpe?g|png|svg|webp|mp4|webm))["'`]/gi;
  const stack = [SRC];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(ts|tsx)$/.test(entry.name))
        for (const m of readFileSync(full, "utf8").matchAll(pattern)) found.add(m[1]);
    }
  }
  return [...found].sort();
}

let failures = 0;
const files = publicFiles();

for (const path of referencedPaths()) {
  const onDisk = join(root, "public", path);
  if (existsSync(onDisk)) {
    console.log(`OK          ${path}`);
    continue;
  }
  if (path.startsWith("/videos/")) {
    failures += 1;
    console.log(`ÉCHEC       ${path} — vidéo référencée mais absente`);
  } else {
    console.log(`EMPLACEMENT VIDE  ${path} — l'assiette dessinée prend le relais`);
  }
}

/* Emplacements automatiques : `/images/products/<id>.svg` appelle `<id>.jpg`. */
const autoSlots = new Set(
  referencedPaths().flatMap((p) =>
    /\.(svg|png)$/i.test(p) && p.startsWith("/images/")
      ? [p, p.replace(/\.(svg|png)$/i, ".jpg")]
      : [p]
  )
);

for (const file of files.sort()) {
  if (!autoSlots.has(file))
    console.log(`NON RÉFÉRENCÉ ${file} — tirage déposé mais jamais appelé`);
}

console.log(
  failures === 0
    ? `\n${referencedPaths().length} chemins référencés, ${files.length} fichiers dans public/images.`
    : `\n${failures} média(s) manquant(s).`
);

process.exit(failures === 0 ? 0 : 1);
