import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";

interface BackToTopProps {
  /** Fraction de la page parcourue avant d'afficher le bouton (0 → 1). */
  threshold?: number;
  className?: string;
}

/**
 * Bouton « Retour en haut » avec anneau de progression rouge (conic-gradient),
 * piloté par la position de scroll. Purement CSS/React, aucune dépendance.
 */
export function BackToTop({ threshold = 0.5, className }: BackToTopProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
      setProgress(ratio);
      setVisible(ratio >= threshold);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [threshold]);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Retour en haut de page"
      className={cn(
        "fixed right-5 bottom-24 z-50 grid h-12 w-12 place-items-center rounded-full",
        "bg-coal/85 text-gold backdrop-blur-md transition-all duration-500 ease-out",
        "hover:bg-coal hover:text-gold-pale md:right-8 md:bottom-8",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0",
        className
      )}
      style={{
        backgroundImage: `conic-gradient(var(--color-signal-bright) ${progress * 360}deg, rgba(239,74,63,0.18) 0deg)`,
        padding: 2,
      }}
    >
      <span className="grid h-full w-full place-items-center rounded-full bg-coal">
        <span className="font-display text-lg leading-none" aria-hidden="true">
          ↑
        </span>
      </span>
    </button>
  );
}
