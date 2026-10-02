import { useState, useEffect, lazy, Suspense } from "react";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { ProgressBar } from "./components/layout/ProgressBar";
import { MobileActionBar } from "./components/layout/MobileActionBar";
import { Loader } from "./components/common/Loader";
import { BackToTop } from "./components/ui/BackToTop";
import { Hero } from "./components/sections/Hero";
import { ProofStrip } from "./components/sections/ProofStrip";
import { Cravings } from "./components/sections/Cravings";
import { Marquee } from "./components/sections/Marquee";
import { Concept } from "./components/sections/Concept";
import { Services } from "./components/sections/Services";
import { MenuSection } from "./components/sections/Menu";
import { Locations } from "./components/sections/Locations";
import { Gallery } from "./components/sections/Gallery";
import { Testimonials } from "./components/sections/Testimonials";
import { Info } from "./components/sections/Info";
import { ContactForm } from "./components/sections/ContactForm";
import { HistoryPage } from "./components/pages/HistoryPage";
import { ContentProvider } from "./content/store";

/**
 * L'administration est chargee a la demande : un visiteur n'en telecharge
 * jamais le code. Le bloc n'est demande que si l'URL commence par /admin.
 */
const AdminApp = lazy(() =>
  import("./admin/AdminApp").then((module) => ({ default: module.AdminApp }))
);

/** Vrai pour /admin et toutes ses sous-pages (/admin/carte, /admin/…). */
const isAdminRoute = (pathname: string) =>
  pathname === "/admin" || pathname.startsWith("/admin/");

/**
 * `ContentProvider` enveloppe les trois routes (accueil, page Histoire, admin).
 *
 * Il est monte ici, et non autour du seul `<main>` : l'administration et la
 * page Histoire lisent aussi le contenu via `useContent()`. Sans provider, elles
 * tomberaient sur le repli livre avec le depot — l'admin afficherait et
 * enregistrerait des valeurs perimees, et une photo ou une citation modifiee
 * depuis l'admin n'apparaitrait jamais sur ces ecrans.
 */
function AppRoutes({
  showHistory,
  onOpenHistory,
  isLoading,
  onLoadingComplete,
}: {
  showHistory: boolean;
  onOpenHistory: () => void;
  isLoading: boolean;
  onLoadingComplete: () => void;
}) {
  if (showHistory) {
    return <HistoryPage onBack={onOpenHistory} />;
  }

  return (
    <main className="bg-cream text-ink antialiased">
      {isLoading && <Loader onComplete={onLoadingComplete} />}
      <ProgressBar />
      <Navbar onNavigate={(page) => page === "histoire" && onOpenHistory()} />
      <Hero />
      <ProofStrip />
      <Cravings />
      <Marquee />
      <Concept />
      <Services />
      <MenuSection />
      <Locations />
      <Marquee variant="caution" />
      <Gallery />
      <Testimonials />
      <Info />
      <ContactForm />
      <Footer onNavigate={(page) => page === "histoire" && onOpenHistory()} />
      <BackToTop />
      <MobileActionBar />
    </main>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // Un site statique sert toujours index.html : la route se lit dans l'URL.
  const [path] = useState(() => window.location.pathname);

  /** Ouvrir ou fermer la page Histoire, en revenant en haut a chaque fois. */
  const openHistory = () => {
    setShowHistory(true);
    window.scrollTo(0, 0);
  };
  const closeHistory = () => {
    setShowHistory(false);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    // Dans l'admin, le fond du site (barres, loader) n'a pas sa place.
    if (isAdminRoute(path)) document.title = "Administration — Texas GrillZ";
  }, [path]);

  return (
    <ContentProvider>
      {isAdminRoute(path) ? (
        <Suspense
          fallback={
            <div className="grid min-h-screen place-items-center bg-charcoal text-smoke">
              Chargement de l&apos;administration…
            </div>
          }
        >
          <AdminApp />
        </Suspense>
      ) : (
        <AppRoutes
          showHistory={showHistory}
          onOpenHistory={showHistory ? closeHistory : openHistory}
          isLoading={isLoading}
          onLoadingComplete={() => setIsLoading(false)}
        />
      )}
    </ContentProvider>
  );
}

export default App;
