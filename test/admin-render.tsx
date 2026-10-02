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
 * doivent eux aussi avoir un `ContentProvider`. On rend donc `SiteVisualsScreen`
 * — avec et sans provider — pour verrouiller la garantie.
 */
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { SessionProvider } from "../src/admin/SessionContext";
import { LoginScreen } from "../src/admin/LoginScreen";
import { ContentProvider } from "../src/content/store";
import { SiteVisualsScreen } from "../src/admin/SiteVisualsScreen";

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

const sansProvider = render(() => createElement(SiteVisualsScreen));
check(
  "Hors ContentProvider, l'erreur est explicite",
  Boolean(sansProvider.error?.includes("useContent doit etre utilise"))
);

const avecProvider = render(() =>
  createElement(ContentProvider, null, createElement(SiteVisualsScreen))
);
check(
  "Avec ContentProvider, l'ecran se rend sans erreur",
  !avecProvider.error && avecProvider.html.length > 0
);

const failed = results.filter(([, ok]) => !ok).length;
for (const [label, ok] of results) {
  originalError(`${ok ? "OK    " : "ECHEC"}  ${label}`);
}
process.exit(failed === 0 ? 0 : 1);
