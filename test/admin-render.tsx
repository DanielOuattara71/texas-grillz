/**
 * Test de rendu de l'admin : verifie que le SessionProvider est bien monte
 * autour de l'ecran de connexion. Sans lui, `useSession` leve une erreur et la
 * page reste blanche.
 *
 * Execute via Vite (`vite-node`) parce que Node seul ne sait pas resoudre les
 * imports .tsx. On rend l'arbre avec react-dom/server et on controle que le
 * titre « administration » apparait : cela prouve que le provider est en place
 * et que l'etat « non connecte » est atteint.
 *
 * Deuxieme partie : les ecrans qui lisent le contenu (carte, visuels, textes)
 * doivent eux aussi avoir un `ContentProvider`. On rend donc `VisualsScreen`
 * — avec et sans provider — pour verrouiller la garantie.
 */
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { SessionProvider } from "../src/admin/SessionContext";
import { LoginScreen } from "../src/admin/LoginScreen";
import { ContentProvider } from "../src/content/store";
import { VisualsScreen } from "../src/admin/VisualsScreen";
import { isPrivileged, needsLocationBlocking, resolveLocationId } from "../src/admin/location";

const results: [string, boolean][] = [];
const check = (label: string, ok: boolean) => results.push([label, ok]);
const originalError = console.error;

/** Rend un arbre en capturant la levee eventuelle, sans bruit console. */
function render(node: () => ReturnType<typeof createElement>): {
  html: string;
  error: string | null;
} {
  const errors: string[] = [];
  const originalError = console.error;
  console.error = (...args) => {
    errors.push(args.map(String).join(" "));
  };
  try {
    return { html: renderToString(node()), error: null };
  } catch (error) {
    return { html: "", error: (error as Error).message };
  } finally {
    console.error = originalError;
    errors.length = 0;
  }
}

const login = render(() =>
  createElement(SessionProvider, null, createElement(LoginScreen))
);

if (login.error) {
  originalError("ECHEC  le rendu a leve :", login.error);
  process.exit(1);
}

check(
  "L'ecran de connexion se rend sans erreur de contexte",
  !login.error && login.html.toLowerCase().includes("administration")
);

/* ── Les ecrans de contenu ont besoin du ContentProvider ───────────────────── */

const sansProvider = render(() => createElement(VisualsScreen));
check(
  "Hors ContentProvider, l'erreur est explicite",
  Boolean(sansProvider.error?.includes("useContent doit etre utilise"))
);

const avecProvider = render(() =>
  createElement(ContentProvider, null, createElement(VisualsScreen))
);
check(
  "Avec ContentProvider, l'ecran se rend sans erreur",
  !avecProvider.error && avecProvider.html.length > 0
);

/* ── D1 : un admin sans location_id ne peut rien éditer ───────────────────── */
// La dérivation est synchrone : jamais de fenêtre où `locationId` vaut
// `null` puis l'édition tombe sur le contenu global (clé `menu`).
check(
  "D1 : admin sans restaurant — locationId null (bloqué)",
  resolveLocationId({ id: 1, email: "a@example.com", name: "A", role: "admin", location_id: null }) === null
);
check(
  "D1 : admin sans restaurant — écran bloquant",
  needsLocationBlocking({ id: 1, email: "a@example.com", name: "A", role: "admin", location_id: null }) === true
);
check(
  "D1 : admin rattaché — location synchrone, sans effet",
  resolveLocationId({ id: 2, email: "b@example.com", name: "B", role: "admin", location_id: "zone-4" }) === "zone-4"
);
check(
  "D1 : admin rattaché — pas de blocage",
  needsLocationBlocking({ id: 2, email: "b@example.com", name: "B", role: "admin", location_id: "zone-4" }) === false
);
check(
  "D1 : super_admin — sélecteur manuel conservé",
  resolveLocationId({ id: 3, email: "c@example.com", name: "C", role: "super_admin", location_id: null }, "riviera-jardin") === "riviera-jardin"
);
check(
  "D1 : developer — non privilégié (rôle technique, lecture seule)",
  isPrivileged({ id: 4, email: "d@example.com", name: "D", role: "developer", location_id: null }) === false
);

const failed = results.filter(([, ok]) => !ok).length;
for (const [label, ok] of results) {
  originalError(`${ok ? "OK    " : "ECHEC"}  ${label}`);
}
process.exit(failed === 0 ? 0 : 1);
