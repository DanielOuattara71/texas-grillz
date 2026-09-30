import { type CSSProperties } from "react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Reveal } from "../ui/Reveal";
import { Numeral } from "../ui/Numeral";
import { FoodMedia } from "../ui/FoodMedia";
import { cn } from "../../utils/cn";

/**
 * Chapitres « notre histoire » : le geste, la matière, la table.
 * Rien d'inventé : les chiffres repris sont ceux du bandeau de preuve.
 */
const chapters = [
  {
    number: "01",
    title: "Le feu",
    text: "Le bois de hêtre entre dans le smoker avant le jour. Douze heures de fumée, une chaleur constante, aucun raccourci.",
  },
  {
    number: "02",
    title: "La viande",
    text: "Quatre coupes chaque matin — brisket, ribs, pulled pork, poulet fermier. Jamais réchauffées, jamais en attente.",
  },
  {
    number: "03",
    title: "L'ardoise",
    text: "Coleslaw coupée le matin, mac & cheese gratiné à la commande, cornbread tiédi au dernier moment.",
  },
  {
    number: "04",
    title: "La table",
    text: "Les sauces au centre, les planches qui circulent, et le temps qu'il faut pour tout finir proprement.",
  },
];

const chips = ["12 h de fumage", "4 coupes par matin", "Bois de hêtre", "Lyon 3ᵉ, depuis 2017"];

/** Reprise de la boucle du Hero : même fichier, déjà en cache. */
const fireReel = "/videos/Animer_image_barbecue_et_fumée_20260927120505.mp4";

export function Concept() {
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
          number="02"
          label="Notre histoire"
          title="Fumé,"
          accent="jamais pressé"
          subtitle="Depuis 2017 à Lyon 3ᵉ, la même routine : allumer le feu à l'aube, laisser la fumée travailler, ouvrir le smoker quand la croûte est prise. C'est long, c'est le goût."
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
                  photo="/images/concept.jpg"
                  eager
                />
                <span className="stamp-ink absolute bottom-4 right-4 -rotate-3 border-cream/70 bg-charcoal/65 px-3 py-1 text-[11px] leading-none text-cream">
                  Smoker · 5 h 30
                </span>
              </div>

              <figcaption className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="eyebrow">Ce que vous voyez, vous le mangez</span>
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
                <span className="font-display text-[11px] uppercase tracking-[0.14em] text-muted">
                  Bois de hêtre · aucune précipitation
                </span>
              </figcaption>

              <div className="mt-6 flex flex-wrap gap-2">
                {chips.map((chip, i) => (
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
              {chapters.map((chapter, i) => (
                <div
                  key={chapter.title}
                  className={cn(
                    "group flex items-start gap-5 px-6 py-6 md:px-8 md:py-7",
                    i > 0 && "border-t border-line"
                  )}
                >
                  <Numeral value={chapter.number} className="pt-1" />
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
                  « On ne presse rien : c'est le temps qui fait le goût. »
                </p>
                <footer className="mt-4 font-display text-[11px] uppercase tracking-[0.18em] text-gold">
                  Texas GrillZ — fondateur &amp; chef
                </footer>
              </blockquote>
            </Reveal>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
