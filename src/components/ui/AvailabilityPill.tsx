import { cn } from "../../utils/cn";

interface AvailabilityPillProps {
  label: string;
  detail?: string;
  tone?: "open" | "closing" | "closed";
  className?: string;
}

const dotTone: Record<NonNullable<AvailabilityPillProps["tone"]>, string> = {
  open: "bg-[#4CAF7D]",
  /** Jaune de sécurité : l'affiche utilise le ruban pour l'alerte, pas le rouge. */
  closing: "bg-caution",
  closed: "bg-ash",
};

/**
 * Pastille de disponibilité avec point pulsant (animation `pulse-dot`).
 * Utilisée au-dessus du formulaire de réservation et dans la barre mobile.
 */
export function AvailabilityPill({
  label,
  detail,
  tone = "open",
  className,
}: AvailabilityPillProps) {
  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 rounded-full border border-gold/30 bg-coal/60",
        "px-3.5 py-2 font-display text-[10px] uppercase tracking-[0.16em] text-cream",
        className
      )}
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span
          className={cn(
            "absolute inset-0 animate-pulse-dot rounded-full",
            dotTone[tone]
          )}
        />
      </span>
      {label}
      {detail && <span className="font-sans text-[11px] normal-case tracking-normal text-smoke">· {detail}</span>}
    </span>
  );
}
