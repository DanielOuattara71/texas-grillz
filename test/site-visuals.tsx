/**
 * Test des visuels du site.
 *
 * Les visuels fixes (hero, logo, page Histoire) et la galerie vivent dans
 * `visuals` et `gallery`. On verifie que l'admin peut les changer, que les
 * composants recoivent bien la nouvelle valeur, et surtout qu'une donnee
 * incomplete ne casse pas le rendu.
 */
import { mergeContent, defaultContent } from "../src/content/store";

const results = [];
const check = (label, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "OK   " : "ECHEC"}  ${label}${extra ? " — " + extra : ""}`);
};

/* ── 1. Les emplacements livres existent ────────────────────────────────── */

const base = defaultContent();
check(
  "Les emplacements fixes sont declares",
  ["logo", "hero", "concept", "histoire", "histoire-evolution", "fondateur"].every(
    (id) => id in base.visuals
  ),
  Object.keys(base.visuals).join(", ")
);
check("La galerie livre des visuels", base.gallery.length > 0, `${base.gallery.length} vignettes`);
check(
  "Chaque vignette a un type et une source",
  base.gallery.every((v) => (v.type === "image" || v.type === "video") && Boolean(v.src))
);
check(
  "Chaque vignette a un texte alternatif",
  base.gallery.every((v) => v.alt.trim().length > 0)
);

/* ── 2. L'admin change un visuel fixe ───────────────────────────────────── */

const avecLogo = mergeContent({
  visuals: [{ id: "logo", src: "/uploads/misc/nouveau-logo.png" }],
});
check(
  "Logo modifie pris en compte",
  avecLogo.visuals.logo?.src === "/uploads/misc/nouveau-logo.png"
);
// Le libelle doit survivre a la fusion : l'admin n'envoie que la source.
check(
  "Le libelle de l'emplacement est conserve",
  (avecLogo.visuals.logo?.label ?? "").length > 0,
  avecLogo.visuals.logo?.label ?? "VIDE"
);
check(
  "Le type de l'emplacement est conserve",
  avecLogo.visuals.logo?.type === "image"
);
check(
  "Les autres emplacements ne bougent pas",
  avecLogo.visuals.histoire?.src === base.visuals.histoire?.src
);

/* ── 3. Galerie reordonnee et agrandie ──────────────────────────────────── */

const inversee = mergeContent({
  gallery: [...base.gallery].reverse().map((v) => ({ ...v })),
});
check(
  "L'ordre de la galerie est respecte",
  inversee.gallery[0]?.id === base.gallery[base.gallery.length - 1]?.id,
  `${inversee.gallery[0]?.id} en tete`
);
check("Aucune vignette perdue", inversee.gallery.length === base.gallery.length);

const retref = mergeContent({
  gallery: [{ id: "g1", type: "image", src: "/uploads/gallery/nouvelle.jpg", alt: "Nouvelle" }],
});
check(
  "La galerie remplace entierement la liste livree",
  retref.gallery.length === 1 && retref.gallery[0]?.src === "/uploads/gallery/nouvelle.jpg"
);

/* ── 4. Donnees incompletes : le site ne doit pas casser ────────────────── */

check(
  "Emplacement inconnu ignore (contenu d'une version anterieure)",
  mergeContent({ visuals: [{ id: "emplacement-disparu", src: "/uploads/x.jpg" }] })
    .visuals.logo?.src === base.visuals.logo?.src
);
check(
  "Vignette sans source ecartee",
  mergeContent({ gallery: [{ id: "g1", type: "image", src: "", alt: "x" }] }).gallery.length === 0
);
check(
  "Vignette sans type ecartee",
  mergeContent({ gallery: [{ id: "g1", src: "/uploads/x.jpg", alt: "x" }] }).gallery.length === 0
);
check(
  "Galerie pas un tableau -> repli sur la galerie livree",
  mergeContent({ gallery: "oups" }).gallery.length === base.gallery.length
);
check(
  "Visuels pas un tableau -> repli sur les visuels livres",
  mergeContent({ visuals: "oups" }).visuals.logo?.src === base.visuals.logo?.src
);

/* ── 5. Le hero vide joue la boucle video de repli ──────────────────────── */

check(
  "Hero livre sans photo (la boucle video joue)",
  base.visuals.hero?.src === ""
);
check(
  "Hero modifiable : une photo remplace la boucle",
  mergeContent({ visuals: [{ id: "hero", src: "/uploads/hero.jpg" }] })
    .visuals.hero?.src === "/uploads/hero.jpg"
);

/* ── 6. Les textes sont fusionnes, pas remplaces ────────────────────────────
 * L'admin enregistre un bloc complet. Si un bloc partiel vidait les autres
 * sections, un enregistrement depuis l'onglet « Textes » effacerait le hero et
 * la page Histoire. On verifie la fusion cle par cle, et le repli sur les
 * textes livres quand l'API n'envoie rien.
 */

check(
  "Un texte modifie remplace l'ancien",
  mergeContent({ texts: { hero: { eyebrow: "Nouveau sur-titre" } } }).texts.hero
    .eyebrow === "Nouveau sur-titre"
);
check(
  "La fusion conserve les champs voisins du meme en-tete",
  mergeContent({ texts: { hero: { eyebrow: "Nouveau sur-titre" } } }).texts.hero
    .paragraph === base.texts.hero.paragraph
);
check(
  "La fusion conserve les autres sections",
  mergeContent({ texts: { hero: { eyebrow: "x" } } }).texts.menu.title ===
    base.texts.menu.title
);
check(
  "Une liste de textes est remplacee entierement",
  mergeContent({ texts: { marquee: ["Un seul mot"] } }).texts.marquee.length === 1
);
check(
  "Modifier un titre de section ne touche pas aux autres",
  mergeContent({ texts: { menu: { title: "Notre carte" } } }).texts.gallery.title ===
    base.texts.gallery.title
);
check(
  "Aucun texte recu -> repli sur les textes livres",
  mergeContent({}).texts.hero.eyebrow === base.texts.hero.eyebrow
);
check(
  "Textes recus au format invalide -> repli sur les textes livres",
  mergeContent({ texts: "oups" }).texts.hero.eyebrow === base.texts.hero.eyebrow
);
check(
  "Un titre au mauvais format ne casse pas le rendu (reste affichable)",
  typeof mergeContent({ texts: { menu: { title: 42 } } }).texts.menu.title !== "object"
);
// Le serveur refuse une valeur non textuelle (test `format.test.cjs`) : ce cas
// ne devrait jamais arriver. Le store ne le bloque pas, il affiche tel quel —
// « 42 » dans un titre est laid mais le site reste lisible.

/* ── 7. Les textes de la page Histoire sont independants ──────────────────── */

check(
  "La page Histoire est modifiable",
  mergeContent({ historyTexts: { quote: "Nouvelle citation" } }).historyTexts
    .quote === "Nouvelle citation"
);
check(
  "Modifier l'Histoire ne touche pas aux sections",
  mergeContent({ historyTexts: { quote: "x" } }).texts.hero.eyebrow ===
    base.texts.hero.eyebrow
);
check(
  "Les chapitres de l'Histoire sont preserves hors citation",
  mergeContent({ historyTexts: { quote: "x" } }).historyTexts.chapters.length ===
    base.historyTexts.chapters.length
);
check(
  "Histoire recue au format invalide -> repli sur les textes livres",
  mergeContent({ historyTexts: "oups" }).historyTexts.quote ===
    base.historyTexts.quote
);

/* ── 8. Le telephone du message d'erreur suit la meme source ───────────────── */

const telephoneEdite = mergeContent({
  site: { ...base.site, phone: "04 11 22 33 44" },
});
check("Le telephone edite est lu par le site", telephoneEdite.phone === "04 11 22 33 44");

const failed = results.filter((r) => !r).length;
console.log(failed === 0 ? "\nVISUELS DU SITE : TOUS LES TESTS PASSENT" : `\n${failed} ECHEC(S)`);
process.exit(failed === 0 ? 0 : 1);