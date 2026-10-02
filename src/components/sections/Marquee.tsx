import { type CSSProperties } from "react";
import { useContent } from "../../content/store";
import { cn } from "../../utils/cn";

/** Ruban doré : les mots viennent du contenu, modifiables depuis l'admin. */
const outlineItems = [
  "Juteux",
  "Fondant",
  "Juteux",
  "Fondant",
  "Juteux",
  "Fondant",
];

interface MarqueeProps {
  /** "gold" : le ruban du site — "caution" : le ruban de chantier des affiches. */
  variant?: "gold" | "caution";
}

export function Marquee({ variant = "gold" }: MarqueeProps) {
  const caution = variant === "caution";

  const { texts } = useContent();

  return (
    <div data-marquee className="relative z-[2] overflow-hidden py-4 -my-2">
      <div
        className={cn(
          "-rotate-1 scale-x-105 py-4",
          caution ? "caution-tape relative" : "bg-gold"
        )}
      >
        {caution ? (
          <>
            <span
              aria-hidden="true"
              className="caution-hazard pointer-events-none absolute inset-y-0 left-0 z-10 w-10 md:w-20"
            />
            <span
              aria-hidden="true"
              className="caution-hazard pointer-events-none absolute inset-y-0 right-0 z-10 w-10 md:w-20"
            />
          </>
        ) : null}
        {/* Rangée 1 — texte plein charbon, défile vers la gauche */}
        <div className="marquee-track animate-marquee">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center" aria-hidden={copy === 1}>
              {texts.marquee.map((item) => (
                <span
                  key={item}
                  className="flex items-center font-display text-lg font-semibold uppercase tracking-[0.12em] text-coal"
                >
                  <span className="mx-8">{item}</span>
                  <span className="mx-0 text-coal/50">•</span>
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* Rangée 2 — contour crème, défile vers la droite à autre vitesse */}
        <div
          className="marquee-track animate-marquee-rev mt-1"
          style={{ "--marquee-duration": "38s" } as CSSProperties}
          aria-hidden="true"
        >
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center">
              {outlineItems.map((word, i) => (
                <span
                  key={`${word}-${i}`}
                  className="marquee-outline mx-8 text-[26px] uppercase leading-none tracking-[0.24em]"
                  style={{ WebkitTextStroke: "1px rgba(20,18,16,0.55)" }}
                >
                  {word}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
