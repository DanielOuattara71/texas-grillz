import { type CSSProperties } from "react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Reveal } from "../ui/Reveal";
import { Numeral } from "../ui/Numeral";
import { FoodMedia } from "../ui/FoodMedia";
import { useContent } from "../../content/store";
import { photoSlot } from "../../utils/photoSlot";
import { cn } from "../../utils/cn";

/** Reprise de la boucle du Hero : même fichier, déjà en cache. */
const fireReel = "/videos/Animer_image_barbecue_et_fumée_20260927120505.mp4";

export function Concept() {
  // Visuel du smoker et textes sont modifiables depuis l'admin. Sans photo, la
  // boucle video joue sur desktop et l'assiette dessinee prend le relais.
  const { visuals, texts } = useContent();
  const conceptVisual = visuals.concept;
  const copy = texts.concept;

  return (
    <section
      id="concept"
      className="section-stack relative overflow-hidden bg-cream py-24 md:py-36"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 48px, #1c1917 48px, #1c1917 50px), repeating-linear-gradient(90deg, transparent, transparent 98px, #1c1917 98px, #1c1917 100px)`,
        }}
        aria-hidden="true"
      />
      <Container>
        <SectionHeading
          number={copy.number}
          label={copy.label}
          title={copy.title}
          accent={copy.accent}
          subtitle={copy.subtitle}
          align="left"
        />

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Le visuel qui fume : boucle réelle, cadre poster, tampon daté */}
          <Reveal variant="left" className="lg:col-span-7">
            <figure className="m-0">
              <div className="food-frame aspect-[16/11] bg-coal">
                <FoodMedia
                  label="Le smoker"
                  alt="Viandes en train de fumer au-dessus des braises"
                  video={fireReel}
                  photo={conceptVisual?.src ? photoSlot(conceptVisual.src) : ""}
                  eager
                />
                <span className="stamp-ink absolute bottom-4 right-4 -rotate-3 border-cream/70 bg-charcoal/65 px-3 py-1 text-[11px] leading-none text-cream">
                  {copy.stamp}
                </span>
              </div>

              <figcaption className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="eyebrow">{copy.frameCaption}</span>
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
                <span className="font-display text-[11px] uppercase tracking-[0.14em] text-muted">
                  {copy.frameNote}
                </span>
              </figcaption>

              <div className="mt-6 flex flex-wrap gap-2">
                {copy.chips.map((chip, i) => (
                  <span
                    key={chip}
                    className={cn(
                      "rounded-[3px] border px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.14em]",
                      i === 0
                        ? "border-signal-deep/40 bg-signal-deep/8 text-signal-deep"
                        : "border-line bg-card text-muted"
                    )}
                    style={{ transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)` } as CSSProperties}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </figure>
          </Reveal>

          {/* Les quatre chapitres, posés comme des cartouches d'affiche */}
          <Reveal variant="right" className="lg:col-span-5">
            <div className="card-surface overflow-hidden">
              {copy.chapters.map((chapter, i) => (
                <div
                  key={chapter.title}
                  className={cn(
                    "group flex items-start gap-5 px-6 py-6 md:px-8 md:py-7",
                    i > 0 && "border-t border-line"
                  )}
                >
                  <Numeral value={`0${i + 1}`} className="pt-1" />
                  <div className="min-w-0">
                    <h3 className="display-title text-[1.25rem] tracking-[0.02em] text-ink transition-transform duration-[450ms] ease-[var(--ease-out-expo)] group-hover:translate-x-1">
                      {chapter.title}
                    </h3>
                    <p className="mt-2 max-w-[46ch] text-[15px] leading-relaxed text-muted">
                      {chapter.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Reveal variant="up" delay={140}>
              <blockquote className="card-surface-dark mt-5 px-7 py-7">
                <p className="font-serif text-[19px] italic leading-relaxed text-cream">
                  {copy.quote}
                </p>
                <footer className="mt-4 font-display text-[11px] uppercase tracking-[0.18em] text-gold">
                  {copy.quoteAuthor}
                </footer>
              </blockquote>
            </Reveal>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
