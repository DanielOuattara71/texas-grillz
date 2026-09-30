import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";

interface RotatorProps {
  words: string[];
  /** Intervalle entre deux mots, en ms */
  interval?: number;
  className?: string;
}

/**
 * Rotateur vertical masqué : les mots défilent dans une fenêtre d'une ligne.
 * La largeur est calée sur le mot le plus long (aucun saut de mise en page).
 * En `prefers-reduced-motion`, seul le premier mot est affiché.
 */
export function Rotator({ words, interval = 3200, className }: RotatorProps) {
  const [index, setIndex] = useState(0);
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), words[0] ?? "");

  useEffect(() => {
    if (words.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [words, interval]);

  return (
    <span className={cn("relative inline-flex flex-col overflow-hidden align-bottom", className)}>
      {/* Placeholder invisible : garantit la largeur du conteneur */}
      <span className="invisible" aria-hidden="true">
        {longest}
      </span>

      <span
        className="absolute inset-0 flex flex-col transition-transform duration-[600ms] ease-[var(--ease-out-expo)] motion-reduce:transition-none"
        style={{ transform: `translateY(-${index * 100}%)` }}
        aria-hidden="true"
      >
        {words.map((word) => (
          <span key={word} className="flex h-[1.15em] items-center leading-[1.15em]">
            {word}
          </span>
        ))}
      </span>

      {/* Lecture d'écran : le mot actuellement affiché */}
      <span className="sr-only">{words[index]}</span>
    </span>
  );
}
