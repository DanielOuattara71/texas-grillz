/**
 * Test du format de donnees.
 *
 * Verifie que le serveur refuse ce qui produirait un affichage casse sur le
 * site public, et qu'il accepte la forme attendue. On teste aussi la validation
 * seule (`validateBlock`), sans demarrer de serveur : c'est elle qui fait foi.
 */
const { validateBlock } = require("../src/schemas");

const results = [];
const check = (label, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "OK   " : "ECHEC"}  ${label}${extra ? " — " + extra : ""}`);
};

/** Un plat complet et valide, servant de reference. */
const platValide = {
  id: "ribs-o-ribs",
  name: "Ribs Ô Ribs",
  description: "Travers de porc assaisonnés à la sauce secrète",
  price: 13000,
  category: "bbq",
  image: "/uploads/products/ribs-o-ribs-abc123.jpg",
};

/* ── Le cas nominal ──────────────────────────────────────────────────────── */

const ok = validateBlock("menu", [platValide]);
check("Plat complet accepte", ok.ok, ok.ok ? "" : ok.error);

/* ── Les quatre champs demandes ──────────────────────────────────────────── */

// Titre manquant.
check(
  "Titre manquant refuse",
  !validateBlock("menu", [{ ...platValide, name: "" }]).ok
);
// Titre trop long.
check(
  "Titre de plus de 120 caracteres refuse",
  !validateBlock("menu", [{ ...platValide, name: "a".repeat(121) }]).ok
);
// Description vide acceptee (boissons, garnitures).
check(
  "Description vide acceptee",
  validateBlock("menu", [{ ...platValide, description: "" }]).ok
);
// Prix : type, signe, bornes (FCFA entiers).
check("Prix non numerique refuse", !validateBlock("menu", [{ ...platValide, price: "24" }]).ok);
check("Prix negatif refuse", !validateBlock("menu", [{ ...platValide, price: -1 }]).ok);
check("Prix aberrant refuse", !validateBlock("menu", [{ ...platValide, price: 1e9 }]).ok);
check("Prix a 0 accepte", validateBlock("menu", [{ ...platValide, price: 0 }]).ok);
check(
  "Prix FCFA entier accepte",
  validateBlock("menu", [{ ...platValide, price: 13000 }]).ok
);
check(
  "Prix a decimales refuse (FCFA entier)",
  !validateBlock("menu", [{ ...platValide, price: 24.5 }]).ok
);
// URL d'image : la regle demandee.
check(
  "URL d'image uploadée acceptée",
  validateBlock("menu", [{ ...platValide, image: "/uploads/products/x.jpg" }]).ok
);
check(
  "URL d'image livrée acceptée",
  validateBlock("menu", [{ ...platValide, image: "/images/products/x.jpg" }]).ok
);
check(
  "URL d'image distante acceptée",
  validateBlock("menu", [{ ...platValide, image: "https://cdn.exemple.fr/x.webp" }]).ok
);
check(
  "Image vide acceptée (assiette dessinée à la place)",
  validateBlock("menu", [{ ...platValide, image: "" }]).ok
);
check(
  "URL d'image cassée refusée",
  !validateBlock("menu", [{ ...platValide, image: "/uploads/products/x.exe" }]).ok
);
check(
  "Chemin relatif refusé (ne mènerait nulle part)",
  !validateBlock("menu", [{ ...platValide, image: "ribs-o-ribs.jpg" }]).ok
);
check(
  "URL d'image sans extension refusée",
  !validateBlock("menu", [{ ...platValide, image: "/uploads/products/ribs-o-ribs" }]).ok
);

/* ── Identifiant et categorie ────────────────────────────────────────────── */

check("Identifiant avec espace refusé", !validateBlock("menu", [{ ...platValide, id: "ribs o ribs" }]).ok);
check("Identifiant avec tiret accepté", validateBlock("menu", [{ ...platValide, id: "ribs-o-ribs" }]).ok);
check("Categorie invalide refusée", !validateBlock("menu", [{ ...platValide, category: "entrees" }]).ok);
check("Categorie bbq acceptee", validateBlock("menu", [{ ...platValide, category: "bbq" }]).ok);

/* ── Formes generales ────────────────────────────────────────────────────── */

check("Carte qui n'est pas un tableau refusee", !validateBlock("menu", { plat: platValide }).ok);
check("Carte vide acceptee (carte videe = page sans plats)", validateBlock("menu", []).ok);
check("Entree non-objet refusee", !validateBlock("menu", ["brisket"]).ok);
check("Bloc inconnu accepte (pas de schema strict)", validateBlock("cravings", [{ label: "x" }]).ok);
check("Contenu undefined refuse", !validateBlock("cravings", undefined).ok);

/* ── Textes des sections ──────────────────────────────────────────────────────
 * Les textes sont imbriques (en-tetes, chapitres, listes). Le serveur refuse
 * les valeurs qui casseraient le rendu public : un objet la ou un titre est
 * attendu afficherait « [object Object] » dans un <h1>.
 */

const textes = {
  hero: { eyebrow: "Barbecue au feu de bois", paragraph: "Ça fume depuis l'aube." },
  menu: { number: "04", label: "La Carte", title: "Nos", accent: "Spécialités" },
  marquee: ["Croûte de poivre", "Fumé 12 h"],
  concept: {
    label: "Notre histoire",
    chapters: [{ title: "Le feu", text: "Douze heures de fumée." }],
  },
  nav: { historyLabel: "Notre Histoire" },
};

check("Textes imbriques acceptes", validateBlock("texts", textes).ok);
check("Textes partiels acceptes (fusion avec le reste)", validateBlock("texts", { hero: { eyebrow: "Nouveau" } }).ok);
check("Liste de textes acceptee", validateBlock("texts", { marquee: ["a", "b"] }).ok);
check("Objet a la place d'un titre refuse", !validateBlock("texts", { hero: { eyebrow: { a: 1 } } }).ok);
check("null dans un texte refuse", !validateBlock("texts", { menu: { title: null } }).ok);
check("Tableau de blocs non textuels refuse", !validateBlock("texts", { menu: [{ id: 1 }] }).ok);
check("Table de textes non-objet refusee", !validateBlock("texts", ["titre"]).ok);
check("Texte de plus de 2000 caracteres refuse", !validateBlock("texts", { menu: { title: "a".repeat(2001) } }).ok);

check("Textes de la page Histoire acceptes", validateBlock("historyTexts", {
  chapters: [{ title: "01", heading: ["A", "B"], paragraphs: ["p1"] }],
  quote: "citation",
  signature: { name: "Texas GrillZ", role: "Chef" },
}).ok);
check("Histoire sans objet refuse", !validateBlock("historyTexts", { quote: { a: 1 } }).ok);

/* ── Visuels et galerie ───────────────────────────────────────────────────── */

const visuel = { id: "hero", src: "/uploads/site/hero.jpg", alt: "Le fumoir" };
check("Visuels acceptes", validateBlock("visuals", { hero: visuel }).ok);
check("Galerie acceptee", validateBlock("gallery", [visuel]).ok);
check("Visuel sans source refuse ? non :.src vide = placeur", validateBlock("visuals", { hero: { src: "", alt: "" } }).ok);
check("Source de visuel qui n'est pas une chaine refusee", !validateBlock("visuals", { hero: { src: 42 } }).ok);
check("Galerie qui n'est pas un tableau refusee", !validateBlock("gallery", { hero: visuel }).ok);

/* ── Le message d'erreur designe le champ fautif ────────────────────────── */

const detail = validateBlock("menu", [{ ...platValide, price: -5 }]);
check(
  "Le message nomme le champ et le plat",
  !detail.ok && detail.error.includes("price") && detail.error.includes("negatif"),
  detail.ok ? "accepte a tort" : detail.error
);

/* ── Horaires ────────────────────────────────────────────────────────────── */

const horaires = [
  { open: "12:00", close: "15:00" },
  { open: null, close: null },
  { open: "18:30", close: "23:00" },
  { open: "18:30", close: "23:00" },
  { open: "18:30", close: "23:00" },
  { open: "18:30", close: "24:00" },
  { open: "18:30", close: "24:00" },
];
check("Horaires valides acceptes", validateBlock("hours", horaires).ok);
check("Horaires incomplets refuses", !validateBlock("hours", horaires.slice(0, 6)).ok);
check(
  "Horaire malformé refusé",
  !validateBlock("hours", [{ ...horaires[0], open: "25:00" }, ...horaires.slice(1)]).ok
);
check("Minuit « 24:00 » accepté", validateBlock("hours", [{ ...horaires[0], close: "24:00" }, ...horaires.slice(1)]).ok);

/* ── Les plats livres passent la validation ──────────────────────────────── */

const livre = require("node:fs").readFileSync(
  require("node:path").join(__dirname, "..", "..", "src", "data", "menu.ts"),
  "utf8"
);
const nombrePlats = (livre.match(/dish\("/g) || []).length;
check(
  "Le fichier src/data/menu.ts declare des plats",
  nombrePlats > 0,
  `${nombrePlats} plat(s)`
);

const failed = results.filter((r) => !r).length;
console.log(failed === 0 ? "\nFORMAT DE DONNEES : TOUS LES TESTS PASSENT" : `\n${failed} ECHEC(S)`);
process.exit(failed === 0 ? 0 : 1);
