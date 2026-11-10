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
import { useCallback, useEffect, useMemo, useState } from "react";
import { SessionProvider, useSession } from "./SessionContext";
import { LoginScreen } from "./LoginScreen";
import { ReservationsScreen } from "./ReservationsScreen";
import { AccountScreen } from "./AccountScreen";
import { ContentScreen } from "./ContentScreen";
import { MediaScreen } from "./MediaScreen";
import { VisualsScreen } from "./VisualsScreen";
import { TextsScreen } from "./TextsScreen";
import { HoursScreen } from "./HoursScreen";
import { PlatsScreen } from "./PlatsScreen";
import { CategoriesScreen } from "./CategoriesScreen";
import { RestaurantsScreen } from "./RestaurantsScreen";
import { AuditScreen } from "./AuditScreen";
import { ActionButton, Select } from "./ui";
import { api } from "./api";
import { isPrivileged, needsLocationBlocking, resolveLocationId } from "./location";
import { allowedTabs, TAB_META, type TabId } from "./permissions";
import { cn } from "../utils/cn";
import { useContent } from "../content/store";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  super_admin: "Super admin",
  developer: "Développeur",
};

const tabFromPath = (pathname: string): TabId => {
  const segment = pathname.replace(/^\/admin\/?/, "").split("/")[0] as TabId;
  return segment in TAB_META ? segment : "reservations";
};

const pathFromTab = (tab: TabId) => (tab === "reservations" ? "/admin" : `/admin/${tab}`);

function Dashboard({
  tab,
  locationId,
}: {
  tab: TabId;
  locationId?: string | null;
}) {
  switch (tab) {
    case "reservations":
      return <ReservationsScreen locationId={locationId} />;
    case "compte":
      return <AccountScreen />;
    case "plats":
      return <PlatsScreen locationId={locationId} />;
    case "categories":
      return <CategoriesScreen locationId={locationId} />;
    case "visuels":
      return <VisualsScreen locationId={locationId} />;
    case "medias":
      return <MediaScreen />;
    case "horaires":
      return <HoursScreen locationId={locationId} />;
    case "avis":
      return (
        <ContentScreen
          block="testimonials"
          title="Avis clients"
          description="Temoignages affiches en carrousel."
          locationId={locationId}
        />
      );
    case "textes":
      return <TextsScreen locationId={locationId} />;
    case "restaurants":
      return <RestaurantsScreen />;
    case "journal":
      return <AuditScreen />;
    default:
      return <ReservationsScreen locationId={locationId} />;
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
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  const privileged = isPrivileged(user);
  const locationId = resolveLocationId(user, selectedLocationId);
  const tabs = useMemo(() => allowedTabs(user), [user]);
  const { locations } = useContent();

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

  // Si l'onglet courant n'est pas autorisé pour le rôle, repli sur Réservations.
  useEffect(() => {
    if (user && tabs.length > 0 && !tabs.includes(tab)) {
      setTab(tabs[0]);
    }
  }, [tabs, tab, user]);

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

  if (needsLocationBlocking(user)) {
    return (
      <div className="min-h-screen bg-charcoal text-cream">
        <header className="border-b border-cream/10 bg-coal">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-4">
            <div className="mr-auto">
              <p className="font-display text-sm text-cream">Administration</p>
              <p className="text-xs text-smoke">{user.name || user.email}</p>
            </div>
            <ActionButton onClick={() => void logout()}>Deconnexion</ActionButton>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-5 py-16">
          <p className="font-display text-xl text-cream">
            Votre compte n&apos;est rattaché à aucun restaurant. Contactez le
            propriétaire.
          </p>
        </main>
      </div>
    );
  }

  const restaurantName = !privileged
    ? user.location ?? locations.find((l) => l.id === locationId)?.name ?? locationId ?? ""
    : null;

  // Premier accès : mot de passe temporaire → redirection vers Mon compte.
  if (user.must_change_password && tab !== "compte") {
    return (
      <div className="min-h-screen bg-charcoal text-cream">
        <main className="mx-auto max-w-2xl px-5 py-16">
          <p className="font-display text-xl text-cream">
            Vous devez changer votre mot de passe temporaire avant de continuer.
          </p>
          <p className="mt-4 text-sm text-smoke">
            Ouvrez « Mon compte » et choisissez un nouveau mot de passe (12 caractères minimum).
          </p>
          <div className="mt-6">
            <ActionButton onClick={() => navigate("compte")}>Aller à Mon compte</ActionButton>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal text-cream">
      <header className="border-b border-cream/10 bg-coal">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-4">
          <img src="/logo.jpg" alt="" className="h-9 w-9 rounded-full object-cover" />
          <div className="mr-auto">
            <p className="font-display text-sm text-cream">Administration</p>
            <p className="text-xs text-smoke">
              {user.name || user.email} · {ROLE_LABEL[user.role ?? "admin"] ?? user.role}
              {restaurantName ? ` · ${restaurantName}` : ""}
            </p>
          </div>
          {privileged && (
            <Select
              value={locationId ?? ""}
              onChange={(e) => setSelectedLocationId(e.target.value || null)}
              aria-label="Siege (branche) du contenu"
              className="w-64"
            >
              <option value="">Contenu global (tous les sieges)</option>
              {locations.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </Select>
          )}
          {privileged && locationId && (
            <ActionButton
              tone="danger"
              onClick={async () => {
                if (
                  !window.confirm(
                    `Supprimer le contenu du siege « ${locationId} » ?\nCette action est irreversible.`
                  )
                ) {
                  return;
                }
                await api.deleteLocationContent(locationId);
                setSelectedLocationId(null);
                navigate("reservations");
              }}
            >
              Supprimer ce siege
            </ActionButton>
          )}
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
            {tabs.map((id) => (
              <li key={id}>
                <button
                  onClick={() => navigate(id)}
                  aria-current={tab === id ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap border-b-2 px-4 py-3 font-display text-[11px] uppercase tracking-[0.14em] transition-colors",
                    tab === id
                      ? "border-gold text-gold"
                      : "border-transparent text-smoke hover:text-cream"
                  )}
                >
                  {TAB_META[id].label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <Dashboard tab={tab} locationId={locationId} />
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-10 text-xs text-ash">
        Texas GrillZ, espace d&apos;administration.
      </footer>
    </div>
  );
}
