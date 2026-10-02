import { useCallback, useEffect, useRef } from "react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Reveal } from "../ui/Reveal";
import { Numeral } from "../ui/Numeral";
import { type Testimonial } from "../../data/testimonials";
import { useContent } from "../../content/store";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1" aria-label={`${rating} sur 5 étoiles`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={i < rating ? "text-gold-deep" : "text-ink/15"}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  );
}

/** Mention « Avis Google » : monogramme rouge + lien vers la fiche établissement. */
function GoogleTag({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted transition-colors duration-200 hover:text-gold-deep"
    >
      <span
        aria-hidden="true"
        className="grid h-4 w-4 place-items-center rounded-full bg-gold-deep font-display text-[10px] font-bold text-cream"
      >
        G
      </span>
      Avis Google
    </a>
  );
}

function ReviewCard({
  item,
  index,
  ratingUrl,
}: {
  item: Testimonial;
  index: number;
  ratingUrl: string;
}) {
  return (
    <article className="card-surface card-ripple flex h-full w-[86vw] max-w-[calc(100%-3rem)] flex-col p-7 sm:w-[54vw] sm:max-w-none lg:w-[calc(33.333%-0.75rem)]">
      <div className="flex items-start justify-between gap-4">
        <Stars rating={item.rating} />
        <Numeral value={`0${index + 1}`} />
      </div>

      <p className="mt-4 flex-1 text-[15px] leading-relaxed text-ink">
        “{item.text}”
      </p>

      <div className="mt-6 flex items-end justify-between gap-4 border-t border-line pt-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full border border-gold-deep/30">
            <span className="font-display text-sm font-semibold text-gold-deep">
              {item.name.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-display text-sm uppercase tracking-[0.08em] text-ink">
              {item.name}
            </p>
            <p className="mt-0.5 text-xs text-muted">{item.date}</p>
          </div>
        </div>
        {item.source === "google" && <GoogleTag url={ratingUrl} />}
      </div>
    </article>
  );
}

/**
 * Rangée d'avis en scroll-snap (navigation tactile native, sans library)
 * avec barre de progression rouge liée à la position de défilement.
 */
function Reviews({ reviews, ratingUrl }: { reviews: Testimonial[]; ratingUrl: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  const syncProgress = useCallback(() => {
    const track = trackRef.current;
    const bar = barRef.current;
    if (!track || !bar) return;
    const max = track.scrollWidth - track.clientWidth;
    const ratio = max > 4 ? track.scrollLeft / max : 1;
    bar.style.transform = `scaleX(${0.12 + ratio * 0.88})`;
  }, []);

  useEffect(() => {
    syncProgress();
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", syncProgress, { passive: true });
    window.addEventListener("resize", syncProgress);
    return () => {
      track.removeEventListener("scroll", syncProgress);
      window.removeEventListener("resize", syncProgress);
    };
  }, [syncProgress]);

  return (
    <>
      <div ref={trackRef} className="snap-row -mx-4 px-4 md:mx-0 md:px-0">
        {reviews.map((item, i) => (
          <ReviewCard
            key={item.id}
            item={item}
            index={i}
            ratingUrl={ratingUrl}
          />
        ))}
      </div>

      <div
        className="mt-8 h-[3px] w-full overflow-hidden rounded-full bg-ink/10"
        aria-hidden="true"
      >
        <span
          ref={barRef}
          className="block h-full origin-left rounded-full bg-gradient-to-r from-gold-deep to-gold transition-transform duration-200 ease-out"
          style={{ transform: "scaleX(0.12)" }}
        />
      </div>

      <p className="mt-3 text-xs text-muted lg:hidden">
        Faites glisser pour lire les autres avis.
      </p>
    </>
  );
}

export function Testimonials() {
  const { testimonials: reviewsList, rating, texts } = useContent();

  if (reviewsList.length === 0) return null;

  const reviews = rating.reviews.toLocaleString("fr-FR");
  const score = rating.score.toLocaleString("fr-FR");

  return (
    <section id="avis" className="section-stack bg-sand py-24 md:py-36">
      <Container>
        <SectionHeading
          number={texts.testimonials.number}
          label={texts.testimonials.label}
          title={texts.testimonials.title}
          accent={texts.testimonials.accent}
          count={`${reviews} avis`}
          subtitle={`Note moyenne de ${score}/5 sur Google, sur ${reviews} avis collectés. Les témoignages ci-dessous sont récents.`}
        />

        <Reveal variant="up">
          <Reviews reviews={reviewsList} ratingUrl={rating.url} />
        </Reveal>
      </Container>
    </section>
  );
}
