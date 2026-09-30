import { useState } from "react";
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

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  if (showHistory) {
    return (
      <HistoryPage
        onBack={() => {
          setShowHistory(false);
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  return (
    <main className="bg-cream text-ink antialiased">
      {isLoading && <Loader onComplete={() => setIsLoading(false)} />}
      <ProgressBar />
      <Navbar onNavigate={(page) => page === "histoire" && setShowHistory(true)} />
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
      <Footer onNavigate={(page) => page === "histoire" && setShowHistory(true)} />
      <BackToTop />
      <MobileActionBar />
    </main>
  );
}

export default App;
