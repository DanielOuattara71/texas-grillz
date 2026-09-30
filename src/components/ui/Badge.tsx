import { cn } from "../../utils/cn";

type BadgeVariant = "signature" | "best-seller" | "nouveau";

interface BadgeProps {
  variant: BadgeVariant;
  className?: string;
}

const labels: Record<BadgeVariant, string> = {
  signature: "Signature",
  "best-seller": "Meilleure vente",
  nouveau: "Nouveau",
};

/**
 * `best-seller` reprend le tampon d'encre des affiches (encre grignotée, posé
 * en biais) : rouge clair + masque, jamais l'or, pour rester lisible sur charbon.
 */
const styles: Record<BadgeVariant, string> = {
  signature: "rounded-full border border-gold/50 bg-coal/70 text-gold backdrop-blur-sm",
  "best-seller":
    "stamp-ink -rotate-1 rounded-[3px] border-2 border-signal-bright text-signal-bright",
  nouveau: "rounded-full border border-cream/25 bg-coal/70 text-cream backdrop-blur-sm",
};

export function Badge({ variant, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 font-display text-[10px] uppercase tracking-[0.16em]",
        styles[variant],
        className
      )}
    >
      {labels[variant]}
    </span>
  );
}
