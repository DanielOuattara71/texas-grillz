import { Reveal } from "./Reveal";
import { cn } from "../../utils/cn";

interface SectionHeadingProps {
  label: string;
  title: string;
  subtitle?: string;
  accent?: string;
  /** Pastille numérotée (plaquette rouge posée en biais) avant l'étiquette, ex. "01" */
  number?: string;
  /** Compteur entre crochets affiché après l'étiquette, ex. "18 plats" */
  count?: string;
  align?: "left" | "center";
  dark?: boolean;
  className?: string;
}

export function SectionHeading({
  label,
  title,
  subtitle,
  accent,
  number,
  count,
  align = "center",
  dark = false,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-14 md:mb-20",
        align === "center" ? "text-center" : "text-left",
        className
      )}
    >
      <Reveal variant="up">
        <div
          className={cn(
            "flex items-center gap-4",
            align === "center" && "justify-center"
          )}
        >
          {number && (
            <span
              className={cn(
                "-rotate-2 inline-flex items-center rounded-[2px] px-1.5 py-[3px] font-display text-[11px] font-semibold leading-none tracking-[0.08em] tabular-nums",
                dark ? "bg-signal-bright text-coal" : "bg-signal-deep text-cream"
              )}
            >
              {number}
            </span>
          )}
          <span
            className={cn("h-px w-8 shrink-0", dark ? "bg-gold/45" : "bg-gold-deep/45")}
            aria-hidden="true"
          />
          <span className={cn("eyebrow", dark && "text-gold")}>{label}</span>
          {count && (
            <span
              className={cn(
                "section-count whitespace-nowrap",
                dark ? "text-gold/75" : "text-gold-deep/80"
              )}
            >
              [{count}]
            </span>
          )}
        </div>
      </Reveal>

      <Reveal variant="up" delay={100}>
        <h2
          className={cn(
            "display-title mt-5 text-[clamp(2.5rem,6vw,5.25rem)]",
            dark ? "text-cream" : "text-ink"
          )}
        >
          {title}
          {accent && (
            <span
              className={cn(
                "ml-4 align-middle font-serif text-[0.58em] font-normal italic normal-case tracking-normal",
                dark ? "text-gold" : "text-gold-deep"
              )}
            >
              {accent}
            </span>
          )}
        </h2>
      </Reveal>

      {subtitle && (
        <Reveal variant="up" delay={200}>
          <p
            className={cn(
              "mt-6 max-w-2xl text-[17px] leading-relaxed",
              align === "center" && "mx-auto",
              dark ? "text-smoke" : "text-muted"
            )}
          >
            {subtitle}
          </p>
        </Reveal>
      )}
    </div>
  );
}
