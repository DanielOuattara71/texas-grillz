import { Button } from "../ui/Button";
import { Reveal } from "../ui/Reveal";
import { TextReveal } from "../ui/TextReveal";
import { Magnetic } from "../ui/Magnetic";
import { FoodMedia } from "../ui/FoodMedia";
import { Navbar } from "../layout/Navbar";

interface HistoryPageProps {
  onBack: () => void;
}

export function HistoryPage({ onBack }: HistoryPageProps) {
  return (
    <main className="bg-cream min-h-screen">
      <Navbar homeOnly onNavigate={() => onBack()} />

      <section className="relative min-h-[70vh] flex items-center justify-center bg-coal overflow-hidden">
        <div className="absolute inset-0">
          <FoodMedia
            label="Braises et fumée"
            alt="Viandes en train de fumer au-dessus des braises"
            video="/videos/Barbecue_grilling_meat_over_coals_20260927120421.mp4"
            photo="/images/hero.svg"
            eager
          />
          <div className="absolute inset-0 bg-gradient-to-b from-charcoal/80 via-charcoal/60 to-charcoal" />
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gold/15 blur-[100px] animate-drift" />

        <div className="relative z-10 text-center px-5 py-32">
          <Reveal variant="blur">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-gold">
              Notre Histoire
            </span>
          </Reveal>
          <h1 className="font-display text-[clamp(3.5rem,10vw,8rem)] text-cream font-bold mt-8 leading-[0.95] tracking-[-0.02em]">
            <TextReveal text="Une Passion" delay={200} />
            <br />
            <span className="font-serif font-normal italic normal-case text-gold text-[0.5em]">
              <TextReveal text="Née en 2017" delay={500} />
            </span>
          </h1>
          <Reveal variant="up" delay={900}>
            <p className="mt-10 text-lg md:text-xl text-cream/60 max-w-xl mx-auto leading-relaxed">
              De la braise à l'assiette, l'histoire d'un homme et d'une passion
              pour le barbecue texan.
            </p>
          </Reveal>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-cream/40">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
            Scroll
          </span>
          <div className="w-[1px] h-8 bg-cream/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gold animate-bounce" />
          </div>
        </div>
      </section>

      <section className="py-24 md:py-40 bg-cream">
        <div className="mx-auto max-w-[1280px] px-5 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <Reveal variant="left">
              <div className="space-y-8">
                <div>
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-gold">
                    01 — Les Débuts
                  </span>
                  <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] font-bold text-ink mt-6 leading-[1.0]">
                    Un voyage au Texas,
                    <br />
                    <span className="text-gold">une envie de partage</span>
                  </h2>
                </div>
                <p className="text-smoke text-lg leading-relaxed">
                  Tout commence par un voyage. Un voyage au cœur du Texas, où
                  le barbecue est bien plus qu'une cuisine : c'est une culture,
                  un art de vivre, un moment de partage.
                </p>
                <p className="text-smoke text-lg leading-relaxed">
                  De retour en France, une évidence s'impose : cette tradition
                  n'existe pas à Lyon. Une envie naît. Celle de faire
                  découvrir ces saveurs fumées, ces cuissons lentes, ces sauces
                  maison qui font la renommée du BBQ texan.
                </p>
              </div>
            </Reveal>

            <Reveal variant="right">
              <div className="relative">
                <div className="aspect-[4/3] rounded-card overflow-hidden bg-coal shadow-2xl shadow-ink/10">
                  <img
                    src="/images/histoire.jpg"
                    alt="Planches fumées servies chez Texas GrillZ"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-gold/10 rounded-card -z-10" />
                <div className="absolute -top-8 -left-8 w-40 h-40 bg-gold/10 rounded-card -z-10" />
              </div>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center mt-32">
            <Reveal variant="left" className="order-2 lg:order-1">
              <div className="relative">
                <div className="aspect-[4/3] rounded-card overflow-hidden bg-coal shadow-2xl shadow-ink/10">
                  <img
                    src="/images/locations/lyon-3.jpg"
                    alt="Salle de Texas GrillZ en service"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-gold/10 rounded-card -z-10" />
              </div>
            </Reveal>

            <Reveal variant="right" className="order-1 lg:order-2">
              <div className="space-y-8">
                <div>
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-gold">
                    02 — L'Évolution
                  </span>
                  <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] font-bold text-ink mt-6 leading-[1.0]">
                    Trois sites,
                    <br />
                    <span className="text-gold">une même exigence</span>
                  </h2>
                </div>
                <p className="text-smoke text-lg leading-relaxed">
                  En 2020, Texas GrillZ ouvre son deuxième site à Lyon 7ème.
                  En 2023, c'est à Villeurbanne que la famille s'agrandit.
                  Trois adresses, une même exigence : la qualité des produits,
                  le respect des cuissons, et l'accueil chaleureux.
                </p>
                <p className="text-smoke text-lg leading-relaxed">
                  Aujourd'hui, c'est une équipe de passionnés qui perpétue la
                  tradition. Chaque matin, le bois de hêtre est allumé. Chaque
                  soir, les viandes sont fumées pour le lendemain.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-24 md:py-40 bg-coal relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold/10 blur-[120px]" />

        <div className="relative mx-auto max-w-[1280px] px-5 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <Reveal variant="left">
              <div className="relative">
                <div className="aspect-[3/4] max-w-md mx-auto rounded-card overflow-hidden bg-coal shadow-2xl shadow-charcoal/50">
                  <img
                    src="/logo.jpg"
                    alt="Fondateur Texas GrillZ"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-gold/10 rounded-card -z-10" />
                <div className="absolute -top-8 -left-8 w-48 h-48 bg-gold/10 rounded-card -z-10" />
              </div>
            </Reveal>

            <Reveal variant="right">
              <div className="space-y-8">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-gold">
                  03 — Le Fondateur
                </span>
                <h2 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-bold text-cream leading-[0.95]">
                  L'Homme Derrière
                  <br />
                  <span className="font-serif font-normal italic normal-case text-gold text-[0.6em]">
                    la Braise
                  </span>
                </h2>
                <blockquote className="border-l-2 border-gold pl-6 py-2">
                  <p className="text-cream/80 text-xl md:text-2xl leading-relaxed italic">
                    "Le barbecue, c'est le temps. Le temps de fumer, le temps
                    de mijoter, le temps de partager. Chaque pièce de viande
                    qui sort de notre cuisine porte en elle cette philosophie.
                    Nous ne nous pressons jamais, car c'est le temps qui fait
                    la différence."
                  </p>
                </blockquote>
                <div className="flex items-center gap-4 pt-4">
                  <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="text-gold font-display font-bold text-xl">
                      T
                    </span>
                  </div>
                  <div>
                    <p className="text-cream font-semibold text-lg">Texas GrillZ</p>
                    <p className="text-cream/50 text-sm">Fondateur & Chef</p>
                  </div>
                </div>
                <div className="pt-6">
                  <Magnetic>
                    <Button href="#contact" variant="primary">
                      Réserver une table
                    </Button>
                  </Magnetic>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

    </main>
  );
}
