import { useInView } from "../../hooks/useInView";
import { useCountUp } from "../../hooks/useCountUp";
import { type Proof } from "../../data/site";
import { cn } from "../../utils/cn";

/**
 * Chiffre clé compté à l'apparition dans le viewport (compteur animé).
 */
export function Stat({ proof, className }: { proof: Proof; className?: string }) {
  const { ref, inView } = useInView({ threshold: 0.4 });
  const display = useCountUp(proof.value, inView, {
    decimals: proof.decimals ?? 0,
    from: proof.from ?? 0,
  });

  return (
    <div ref={ref} className={cn("flex flex-col gap-2", className)}>
      <p className="font-display text-[clamp(2.1rem,4vw,3.1rem)] font-semibold leading-none tabular-nums text-cream">
        <span className="sr-only">
          {`${proof.value.toLocaleString("fr-FR")}${proof.suffix ?? ""} — `}
        </span>
        <span aria-hidden="true">
          {display}
          {proof.suffix && (
            <span className="text-[0.45em] text-signal-bright">{proof.suffix}</span>
          )}
        </span>
      </p>
      <p className="font-serif text-[15px] italic leading-snug text-cream/70">
        {proof.label}
      </p>
    </div>
  );
}
