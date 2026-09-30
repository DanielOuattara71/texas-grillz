import { type ReactNode } from "react";
import { cn } from "../../utils/cn";

interface CautionTapeProps {
  children: ReactNode;
  /** Le ruban des affiches n'est jamais droit : angle en degrés. */
  rotate?: number;
  /** Hachures de chantier aux extrémités. */
  hazard?: boolean;
  className?: string;
}

/**
 * Ruban de chantier jaune : le dispositif signature des visuels de campagne
 * (bandeau de texte condensé noir, posé en biais, hachures aux extrémités).
 * Le message reste du vrai texte : sélectionnable, traduisible, lu par les
 * lecteurs d'écran ; seules les hachures sont décoratives.
 */
export function CautionTape({
  children,
  rotate = -2,
  hazard = true,
  className,
}: CautionTapeProps) {
  return (
    <div
      className={cn(
        "caution-tape relative w-full overflow-hidden py-3 md:py-4",
        className
      )}
      style={{ transform: `rotate(${rotate}deg) scaleX(1.04)` }}
    >
      {hazard ? (
        <>
          <span
            aria-hidden="true"
            className="caution-hazard pointer-events-none absolute inset-y-0 left-0 w-8 md:w-14"
          />
          <span
            aria-hidden="true"
            className="caution-hazard pointer-events-none absolute inset-y-0 right-0 w-8 md:w-14"
          />
        </>
      ) : null}

      <p className="caution-text relative px-10 text-center text-[clamp(0.95rem,2.4vw,1.5rem)] leading-none md:px-16">
        {children}
      </p>
    </div>
  );
}
