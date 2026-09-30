import { type ReactNode, type ElementType, type Ref } from "react";
import { useInView } from "../../hooks/useInView";
import { cn } from "../../utils/cn";
import { DURATION, EASE_OUT_EXPO, type RevealVariant } from "../../utils/animation";

interface RevealProps {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  className?: string;
  as?: ElementType;
}

const HIDDEN: Record<RevealVariant, React.CSSProperties> = {
  up: { opacity: 0, transform: "translateY(50px) scale(0.98)" },
  left: { opacity: 0, transform: "translateX(-50px) scale(0.98)" },
  right: { opacity: 0, transform: "translateX(50px) scale(0.98)" },
  scale: { opacity: 0, transform: "scale(0.95)" },
  blur: { opacity: 0, filter: "blur(10px)" },
};

const VISIBLE: React.CSSProperties = {
  opacity: 1,
  transform: "translateY(0) translateX(0) scale(1)",
  filter: "blur(0)",
};

export function Reveal({
  children,
  variant = "up",
  delay = 0,
  duration = DURATION.reveal,
  className,
  as: Tag = "div",
}: RevealProps) {
  const { ref, inView } = useInView({ threshold: 0.15 });

  return (
    <Tag
      ref={ref as Ref<HTMLElement>}
      className={cn("will-change-transform", className)}
      style={{
        ...(inView ? VISIBLE : HIDDEN[variant]),
        transition: `opacity ${duration}ms ${EASE_OUT_EXPO} ${delay}ms, transform ${duration}ms ${EASE_OUT_EXPO} ${delay}ms${variant === "blur" ? `, filter ${duration}ms ${EASE_OUT_EXPO} ${delay}ms` : ""}`,
      }}
    >
      {children}
    </Tag>
  );
}
