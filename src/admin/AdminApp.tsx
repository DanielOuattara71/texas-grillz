/**
 * Coquille de l'espace d'administration.
 *
 * `SessionProvider` est monte ici, et non dans `App.tsx` : il verifie la
 * session au montage, un appel reseau qui n'a rien a faire sur le site public.
 * Seul l'admin le declenche.
 *
 * Navigation sans routeur : le site est statique, on lit `location.pathname` et
 * on pousse l'historique avec `pushState`. Pas de dependance a installer.
 */
import { useCallback, useEffect, useState } from "react";
import { SessionProvider, useSession } from "./SessionContext";
import { LoginScreen } from "./LoginScreen";
import { ReservationsScreen } from "./ReservationsScreen";
import { AccountScreen } from "./AccountScreen";
import { ContentScreen } from "./ContentScreen";
import { MediaScreen } from "./MediaScreen";
import { SiteVisualsScreen } from "./SiteVisualsScreen";
import { DishPhotosScreen } from "./DishPhotosScreen";
import { TextsScreen } from "./TextsScreen";
import { ActionButton } from "./ui";
import { cn } from "../utils/cn";

/** Onglets de l'administration. */
const TABS = [
  { id: "reservations", label: "Reservations" },
  { id: "carte", label: "Carte" },
  { id: "photos", label: "Photos des plats" },
  { id: "visuels", label: "Visuels du site" },
  { id: "medias", label: "Medias" },
  { id: "horaires", label: "Horaires" },
  { id: "sites", label: "Adresses" },
  { id: "avis", label: "Avis" },
  { id: "textes", label: "Textes" },
  { id: "compte", label: "Mon compte" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** /admin/carte → "carte" ; /admin ou chemin inconnu → onglet par defaut. */
const tabFromPath = (pathname: string): TabId => {
  const segment = pathname.replace(/^\/admin\/?/, "").split("/")[0];
  return TABS.some((tab) => tab.id === segment) ? (segment as TabId) : "reservations";
};

const pathFromTab = (tab: TabId) => (tab === "reservations" ? "/admin" : `/admin/${tab}`);

function Dashboard({ tab }: { tab: TabId }) {
  switch (tab) {
    case "reservations":
      return <ReservationsScreen />;
    case "compte":
      return <AccountScreen />;
    case "carte":
      return <ContentScreen block="menu" title="Carte" description="Plats, prix, descriptions et photos." />;
    case "photos":
      return <DishPhotosScreen />;
    case "visuels":
      return <SiteVisualsScreen />;
    case "medias":
      return <MediaScreen />;
    case "horaires":
      return <ContentScreen block="hours" title="Horaires" description="Ouvertures et fermetures, par jour." />;
    case "sites":
      return <ContentScreen block="locations" title="Adresses" description="Sites, coordonnees et statuts." />;
    case "avis":
      return <ContentScreen block="testimonials" title="Avis clients" description="Temoignages affiches en carrousel." />;
    case "textes":
      return <TextsScreen />;
  }
}

/** Monte la session puis delegue a la coquille qui la consomme. */
export function AdminApp() {
  return (
    <SessionProvider>
      <AdminShell />
    </SessionProvider>
  );
}

/**
 * Coquille reelle : consomme la session, donc DOIT etre rendu sous
 * `SessionProvider` (React execute le corps de la fonction avant de pouvoir
 * placer le provider au-dessus).
 */
function AdminShell() {
  const { user, checking, logout } = useSession();
  const [tab, setTab] = useState<TabId>(() => tabFromPath(window.location.pathname));

  // Le bouton « precedent »/« suivant » du navigateur doit changer d'onglet.
  useEffect(() => {
    const onPop = () => setTab(tabFromPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((next: TabId) => {
    window.history.pushState({}, "", pathFromTab(next));
    setTab(next);
    window.scrollTo(0, 0);
  }, []);

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center bg-charcoal text-smoke">
        Verification de la session…
      </main>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-charcoal text-cream">
      <header className="border-b border-cream/10 bg-coal">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-4">
          <img src="/logo.jpg" alt="" className="h-9 w-9 rounded-full object-cover" />
          <div className="mr-auto">
            <p className="font-display text-sm text-cream">Administration</p>
            <p className="text-xs text-smoke">{user.name || user.email}</p>
          </div>
          <a
            href="/"
            className="rounded-card border border-cream/15 px-3 py-2 font-display text-[11px] uppercase tracking-[0.14em] text-smoke transition-colors hover:border-gold hover:text-gold"
          >
            Voir le site
          </a>
          <ActionButton onClick={() => void logout()}>Deconnexion</ActionButton>
        </div>

        <nav className="mx-auto max-w-6xl overflow-x-auto px-5">
          <ul className="flex gap-1 pb-px">
            {TABS.map((entry) => (
              <li key={entry.id}>
                <button
                  onClick={() => navigate(entry.id)}
                  aria-current={tab === entry.id ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap border-b-2 px-4 py-3 font-display text-[11px] uppercase tracking-[0.14em] transition-colors",
                    tab === entry.id
                      ? "border-gold text-gold"
                      : "border-transparent text-smoke hover:text-cream"
                  )}
                >
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <Dashboard tab={tab} />
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-10 text-xs text-ash">
        Texas GrillZ — espace d&apos;administration.
      </footer>
    </div>
  );
}
