/**
 * Test de la chaine photo : depose -> champ du plat -> affichage du site.
 *
 * C'est le scenario demande : une photo deposee dans l'admin doit se retrouver
 * associee a son plat, et le site doit la servir. On verifie les trois etapes
 * separement, car chacune peut casser silencieusement l'autre.
 */
import { photoSlot, mediaUrl, isUpload } from "../src/utils/photoSlot";
import { mergeContent, defaultContent } from "../src/content/store";

const results = [];
const check = (label, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "OK   " : "ECHEC"}  ${label}${extra ? " — " + extra : ""}`);
};

/* ── 1. photoSlot : transformer un chemin d'illustration ─────────────────── */

check(
  "Illustration .svg -> recherche du .jpg",
  photoSlot("/images/products/ribs-o-ribs.svg") === "/images/products/ribs-o-ribs.jpg"
);
check(
  "Photo deja uploadee : pas de transformation",
  photoSlot("/uploads/products/ribs-o-ribs-abc.jpg") === "/uploads/products/ribs-o-ribs-abc.jpg"
);
check(
  "Photo livree en .jpg : pas de transformation",
  photoSlot("/images/products/ribs-o-ribs.jpg") === "/images/products/ribs-o-ribs.jpg"
);
check("Chemin vide -> chaine vide", photoSlot("") === "");

/* ── 2. mediaUrl : resoudre l'adresse d'un media depose ─────────────────── */

check("Un /uploads est-il detecte ?", isUpload("/uploads/products/x.jpg"));
check("Un /images n'est pas un upload", !isUpload("/images/products/x.jpg"));
// En developpement, API_BASE est vide : l'URL ne change pas. C'est le
// comportement attendu, le proxy Vite servant /api et /uploads au meme hote.
check(
  "Adresse relative conservee quand l'API est locale",
  mediaUrl("/uploads/products/x.jpg").endsWith("/uploads/products/x.jpg"),
  mediaUrl("/uploads/products/x.jpg")
);
check(
  "Photo livree jamais prefixee",
  mediaUrl("/images/products/x.jpg") === "/images/products/x.jpg"
);
check("Adresse vide toleree", mediaUrl("") === "");

/* ── 3. Le site lit la photo associee au plat ────────────────────────────── */

const avecPhoto = mergeContent({
  menu: [
    {
      id: "ribs-o-ribs",
      name: "Ribs Ô Ribs",
      description: "Travers de porc",
      price: 13000,
      category: "bbq",
      image: "/uploads/products/ribs-o-ribs-abc123.jpg",
    },
  ],
});

check(
  "La photo deposee est associee au plat",
  avecPhoto.menu[0]?.image === "/uploads/products/ribs-o-ribs-abc123.jpg"
);
check(
  "photoSlot ne transforme pas une photo d'admin",
  photoSlot(avecPhoto.menu[0]?.image ?? "") ===
    "/uploads/products/ribs-o-ribs-abc123.jpg"
);

/* ── 4. Une envie herite de la photo de son plat ─────────────────────────── */

const envie = avecPhoto.cravings.find((c) => c.item.id === "ribs-o-ribs");
check(
  "L'envie pointe le plat qui porte la photo",
  envie?.item.image === "/uploads/products/ribs-o-ribs-abc123.jpg",
  envie?.item.image ?? "aucune envie"
);

/* ── 5. Un plat sans photo : le site doit le signaler, pas planter ───────── */

const sansPhoto = mergeContent({
  menu: [
    {
      id: "brochette-boeuf",
      name: "Brochette de filet de bœuf",
      description: "Filet de bœuf grillé",
      price: 2000,
      category: "brochettes",
      image: "", // aucune photo associee
    },
  ],
});
check(
  "Un plat sans photo est accepte (assiette dessinee)",
  sansPhoto.menu[0]?.image === ""
);
check(
  "photoSlot d'un champ vide ne produit pas un chemin casse",
  photoSlot(sansPhoto.menu[0]?.image ?? "") === ""
);

/* ── 6. Les photos livrees continuent de fonctionner ─────────────────────── */

const livre = defaultContent();
check(
  "Le ribs-o-ribs livre pointe une vraie photo",
  photoSlot(livre.menu.find((m) => m.id === "ribs-o-ribs")?.image ?? "") ===
    "/images/products/ribs-o-ribs.jpg"
);
const sansJpg = livre.menu.find((m) => m.id === "garn-frites");
check(
  "Un plat livre sans photo vise un .jpg absent (repli prevu)",
  photoSlot(sansJpg?.image ?? "").endsWith("garn-frites.jpg"),
  photoSlot(sansJpg?.image ?? "")
);

const failed = results.filter((r) => !r).length;
console.log(failed === 0 ? "\nCHAINE PHOTO : TOUS LES TESTS PASSENT" : `\n${failed} ECHEC(S)`);
process.exit(failed === 0 ? 0 : 1);
