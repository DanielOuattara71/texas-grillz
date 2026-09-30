import { cn } from "../../utils/cn";

interface NumeralProps {
  /** Texte du numéro, ex. "01" */
  value: string;
  /** true sur fond sombre (rouge clair), false sur crème (rouge profond) */
  dark?: boolean;
  className?: string;
}

/**
 * Numéral rouge : display condensée, chiffres tabulaires, rôle décoratif.
 */
export function Numeral({ value, dark = false, className }: NumeralProps) {
  return (
    <span
      className={cn(
        "font-display text-[clamp(1.5rem,2.2vw,2rem)] font-semibold leading-none tracking-[0.06em] tabular-nums",
        dark ? "text-gold" : "text-gold-deep",
        className
      )}
      aria-hidden="true"
    >
      {value}
    </span>
  );
}
