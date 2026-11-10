import { useScrollY } from "../../hooks/useScrollY";
import { useContent } from "../../content/store";
import { mediaUrl } from "../../utils/photoSlot";
import { Button } from "../ui/Button";
import { Reveal } from "../ui/Reveal";
import { Magnetic } from "../ui/Magnetic";
import { TextReveal } from "../ui/TextReveal";
import { asset } from "../../utils/asset";

export function Hero() {
  const { visuals, texts } = useContent();
  const scrollY = useScrollY();
  const bgOffset = scrollY * 0.2;
  const midOffset = scrollY * 0.4;
  const frontOffset = scrollY * 0.6;

  // Le visuel du hero est modifiable depuis l'admin (onglet « Visuels du site »).
  // Le fond charbon reste le repli si aucune image n'est associee.
  const hero = visuals.hero;

  return (
    <section
      id="accueil"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-charcoal"
    >
      <div
        className="absolute inset-0"
        style={{ transform: `translateY(${bgOffset}px)` }}
      >
        {hero?.src ? (
          // Photo choisie dans l'admin : elle couvre l'ecran. La boucle
          // ci-dessous ne sert que de repli tant qu'aucune photo n'est
          // associee — c'est elle qui donne le mouvement « fume » de l'accueil.
          <img
            src={mediaUrl(hero.src)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <video
            src={asset("videos/Animer_image_barbecue_et_fumée_20260927120505.mp4")}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-charcoal/50 to-charcoal" />
      </div>

      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold/20 blur-[120px] animate-drift"
        style={{ transform: `translate(-50%, calc(-50% + ${midOffset}px))` }}
      />

      <div
        className="relative z-10 text-center px-5 max-w-4xl mx-auto"
        style={{ transform: `translateY(${frontOffset}px)`, opacity: Math.max(0, 1 - scrollY / 700) }}
      >
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span className="h-px w-8 bg-gold/50" aria-hidden="true" />
          <span className="font-display text-xs uppercase tracking-[0.24em] text-cream">
            {texts.hero.eyebrow}
          </span>
          <span className="h-px w-8 bg-gold/50" aria-hidden="true" />
        </div>

        <h1 className="display-title mt-6 text-[clamp(3.75rem,13vw,11rem)] font-semibold text-cream">
          <TextReveal text="Texas" delay={300} />
          <span className="brush-chip ml-4 align-middle px-3 font-serif text-[0.52em] font-normal italic normal-case tracking-normal text-cream">
            <TextReveal text="GrillZ" delay={600} />
          </span>
        </h1>

        <Reveal variant="up" delay={760}>
          <p className="mx-auto mt-8 max-w-xl font-serif text-[17px] italic leading-relaxed text-cream/75 md:text-[19px]">
            {texts.hero.paragraph}
          </p>
        </Reveal>

        <Reveal variant="up" delay={900}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Magnetic>
              <Button href="#contact" variant="primary">
                {texts.hero.ctaPrimary}
              </Button>
            </Magnetic>
            <Magnetic>
              <Button href="#menu" variant="secondary">
                {texts.hero.ctaSecondary}
              </Button>
            </Magnetic>
          </div>
        </Reveal>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-cream/40">
        <span className="font-display text-[10px] uppercase tracking-[0.24em]">
          Scroll
        </span>
        <div className="w-[1px] h-8 bg-cream/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gold animate-bounce" />
        </div>
      </div>
    </section>
  );
}
