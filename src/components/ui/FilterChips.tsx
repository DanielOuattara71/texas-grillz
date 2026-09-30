import { useCallback, useEffect, useRef } from "react";
import { cn } from "../../utils/cn";

export interface ChipOption {
  id: string;
  label: string;
}

interface FilterChipsProps {
  options: readonly ChipOption[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * Filtres à pastille glissante : l'indicateur rouge est positionné par mesure
 * directe du bouton actif (aucun état React, donc aucun rendu cascade).
 * Le conteneur défile en scroll-snap sur mobile.
 */
export function FilterChips({
  options,
  value,
  onChange,
  ariaLabel = "Filtrer la carte",
  className,
}: FilterChipsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  const placePill = useCallback(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;
    const active = list.querySelector<HTMLButtonElement>(
      `[data-value="${value}"]`
    );
    if (!active) return;
    pill.style.transform = `translateX(${active.offsetLeft}px)`;
    pill.style.width = `${active.offsetWidth}px`;
  }, [value]);

  useEffect(() => {
    placePill();
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(placePill);
    observer.observe(list);
    return () => observer.disconnect();
  }, [placePill]);

  return (
    <div
      ref={listRef}
      role="group"
      aria-label={ariaLabel}
      className={cn("snap-row relative items-center", className)}
    >
      <span
        ref={pillRef}
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-0 rounded-full bg-signal-bright transition-[transform,width] duration-[450ms] ease-[var(--ease-out-expo)]"
      />
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            data-value={option.id}
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "relative z-[1] whitespace-nowrap rounded-full px-5 py-2.5",
              "font-display text-[11px] uppercase tracking-[0.16em]",
              "transition-colors duration-300",
              active ? "text-coal" : "text-smoke hover:text-gold"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
