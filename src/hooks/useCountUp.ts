import { useEffect, useRef, useState } from "react";

interface CountUpOptions {
  /** Durée totale en ms */
  duration?: number;
  /** Décimales affichées (4,9) */
  decimals?: number;
  /** Valeur de départ (les années démarrent plus haut pour éviter l'effet machine à sous) */
  from?: number;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Compteur animé (easing expo) déclenché quand `active` passe à true.
 * Retourne une chaîne au format français ("4,9").
 * En `prefers-reduced-motion`, la valeur finale est affichée directement.
 */
export function useCountUp(
  target: number,
  active: boolean,
  { duration = 1400, decimals = 0, from = 0 }: CountUpOptions = {}
) {
  const [animated, setAnimated] = useState(from);
  const [reduced] = useState(prefersReducedMotion);
  const frame = useRef(0);

  useEffect(() => {
    if (!active || reduced) return;

    const start = performance.now();
    const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setAnimated(from + (target - from) * easeOutExpo(t));
      if (t < 1) frame.current = window.requestAnimationFrame(tick);
    };

    frame.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame.current);
  }, [active, target, duration, from, reduced]);

  /* Lecture réduite : valeur finale directe. Sinon, le compteur démarre à `from`
     (valeur d'état initiale) quand la section entre dans le viewport. */
  const value = reduced ? target : animated;
  return value.toFixed(decimals).replace(".", ",");
}
