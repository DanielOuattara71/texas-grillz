import { type ReactNode } from "react";
import { Reveal } from "./Reveal";
import type { RevealVariant } from "../../utils/animation";

interface RevealGroupProps {
  children: ReactNode;
  variant?: RevealVariant;
  stagger?: number;
  className?: string;
}

export function RevealGroup({
  children,
  variant = "up",
  stagger = 100,
  className,
}: RevealGroupProps) {
  const items = Array.isArray(children) ? children : [children];

  return (
    <div className={className}>
      {items.map((child, i) => (
        <Reveal key={i} variant={variant} delay={i * stagger}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
