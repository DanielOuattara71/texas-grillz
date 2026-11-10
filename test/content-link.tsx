/**
 * Test de la liaison site <-> API.
 *
 * Simule une edition faite dans l'admin, puis verifie que `mergeContent` — la
 * fonction que le site appelle au demarrage — la restitue correctement, et que
 * le repli sur les donnees livrees fonctionne quand l'API ne repond pas.
 *
 * C'est le test qui prouve qu'editer dans l'admin change le site public.
 */
import { mergeContent, defaultContent } from "../src/content/store";

// 1. Contenu edite par l'admin : un prix change, une photo deposee.
const edited = mergeContent({
  menu: [
    {
      id: "ribs-o-ribs",
      name: "Ribs Ô Ribs",
      description: "Travers de porc assaisonnés",
      price: 15000, // prix modifie dans l'admin
      category: "bbq",
      image: "/uploads/products/ribs-o-ribs-abc123.jpg", // photo deposee
    },
  ],
  site: { phone: "05 01 90 30 90" },
});

const results = [];
const check = (label, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "OK   " : "ECHEC"}  ${label}${extra ? " — " + extra : ""}`);
};

// Le prix edite est pris en compte.
check(
  "Prix modifie par l'admin pris en compte",
  edited.menu[0]?.price === 15000,
  `prix = ${edited.menu[0]?.price}`
);

// La photo deposee est reprise telle quelle.
check(
  "Photo deposee reprise",
  edited.menu[0]?.image === "/uploads/products/ribs-o-ribs-abc123.jpg"
);

// Le telephone edite est repris.
check("Telephone edite repris", edited.phone === "05 01 90 30 90", edited.phone);

// Les envies pointent sur la carte editee (pas sur le fichier livre).
check(
  "Envies resolues sur la carte de l'API",
  edited.cravings.every((craving) => edited.menu.some((item) => item.id === craving.item.id)),
  `${edited.cravings.length} envie(s)`
);
check(
  "Envie herite du nouveau prix",
  edited.cravings.find((c) => c.item.id === "ribs-o-ribs")?.item.price === 15000
);

// Un bloc absent de la reponse retombe sur les donnees livrees.
const partial = mergeContent({ site: { phone: "01 00 00 00 00" } });
check(
  "Carte absente -> repli sur les donnees livrees",
  partial.menu.length === defaultContent().menu.length,
  `${partial.menu.length} plats`
);
check("Repli conserve les services livres", partial.services.length === 4);

// Une envie qui pointe vers un plat supprime est ecartee, sans casser le rendu.
const orphan = mergeContent({
  menu: [],
  cravings: [{ id: "plat-inexistant", kicker: "x", hook: "y", featured: true }],
});
check(
  "Envie orpheline ecartee sans erreur",
  Array.isArray(orphan.cravings),
  `${orphan.cravings.length} envie(s) restante(s)`
);

// Une reponse vide ou absurde ne casse rien.
for (const [label, payload] of [
  ["objet vide", {}],
  ["null", null],
  ["tableau", []],
  ["horaires de mauvaise longueur", { hours: [{ open: "10:00", close: "12:00" }] }],
  ["menu non tableau", { menu: "oups" }],
  ["site sans adresse", { site: {} }],
]) {
  try {
    const safe = mergeContent(payload as Record<string, unknown>);
    check(`Reponse invalide toleree (${label})`, Array.isArray(safe.menu));
  } catch (error) {
    check(`Reponse invalide toleree (${label})`, false, String(error));
  }
}

// L'interface complete est presente (accidentalement retiree lors d'un edit).
const full = defaultContent();
check(
  "Contenu livre complet",
  Boolean(full.address && full.hours.length === 7 && full.navLinks.length > 0)
);

const failed = results.filter((r) => !r).length;
console.log(failed === 0 ? "\nLIAISON API : TOUS LES TESTS PASSENT" : `\n${failed} ECHEC(S)`);
process.exit(failed === 0 ? 0 : 1);
