/**
 * Contrôle des contrastes WCAG de la palette de marque.
 *   node scripts/check-contrast.mjs
 *
 * Le site a basculé de l'or au rouge signal du logo : ce script fige les
 * minimums AA (4,5:1 texte courant, 3:1 texte large) pour éviter qu'un
 * changement de token ne casse la lisibilité. Sortie ≠ 0 si un couple échoue.
 */

const AA_SMALL = 4.5;
const AA_LARGE = 3;

/** Couples [premier plan, fond, seuil, usage]. */
const pairs = [
  ["#ef4a3f", "#141210", AA_SMALL, "accent rouge clair sur charbon (liens, prix, focus)"],
  ["#ef4a3f", "#0a0a0a", AA_SMALL, "accent rouge clair sur noir (badges, pastilles)"],
  ["#f2c11d", "#141210", AA_SMALL, "jaune de sécurité sur charbon (statut « bientôt fermé »)"],
  ["#9c1712", "#f6f1e7", AA_SMALL, "rouge profond sur crème (étiquettes, liens dorés)"],
  ["#9c1712", "#efe7d8", AA_SMALL, "rouge profond sur carte (étiquettes de section)"],
  ["#0a0a0a", "#f2c11d", AA_SMALL, "texte du ruban de chantier (noir sur jaune)"],
  ["#141210", "#ef4a3f", AA_SMALL, "libellé du bouton principal (charbon sur rouge)"],
  ["#f6f1e7", "#d5271e", AA_SMALL, "libellé du bouton principal au survol (crème sur rouge)"],
  ["#f2c11d", "#050505", AA_SMALL, "appel à l'action du bandeau affiche (jaune sur noir)"],
  ["#d5271e", "#050505", AA_LARGE, "tampon d'encre SOLD OUT (grands capitales)"],
  ["#8a8178", "#141210", AA_SMALL, "texte secondaire sur charbon"],
  ["#1c1917", "#fbe7d9", AA_SMALL, "encre sur fond pêche (section Envies)"],
  ["#3d1108", "#fbe7d9", AA_SMALL, "croûte de fumée sur fond pêche"],
  ["#9c1712", "#fbe7d9", AA_SMALL, "étiquette rouge profond sur fond pêche"],
  ["#1c1917", "#fffaf3", AA_SMALL, "accroche sur carte coquille (tuiles d'envie)"],
  ["#b3320d", "#fffaf3", AA_SMALL, "kicker laque sur carte coquille"],
  ["#3d1108", "#f0a52e", AA_SMALL, "prix sur étiquette de prix miel"],
];

const channel = (hex, i) => {
  const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) =>
  0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);

const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

let failures = 0;

for (const [fg, bg, min, label] of pairs) {
  const value = ratio(fg, bg);
  const pass = value >= min;
  if (!pass) failures += 1;
  console.log(
    `${pass ? "OK  " : "ÉCHEC"}  ${value.toFixed(2)}:1 (min ${min})  ${fg} sur ${bg} — ${label}`
  );
}

console.log(
  failures === 0
    ? `\n${pairs.length} couples conformes.`
    : `\n${failures} couple(s) sous le seuil AA.`
);

process.exit(failures === 0 ? 0 : 1);
