import { useInView } from "../../hooks/useInView";
import { cn } from "../../utils/cn";

interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  as?: "span" | "div" | "h1" | "h2" | "h3" | "p";
}

export function TextReveal({ text, className, delay = 0, as: Tag = "span" }: TextRevealProps) {
  const { ref, inView } = useInView();
  const words = text.split(" ");

  return (
    <Tag ref={ref as never} className={cn("inline", className)}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <span
            className="inline-block transition-all duration-700 ease-out will-change-transform"
            style={{
              transform: inView ? "translateY(0)" : "translateY(110%)",
              opacity: inView ? 1 : 0,
              transitionDelay: `${delay + i * 60}ms`,
            }}
          >
            {word}
            {i < words.length - 1 ? "\u00A0" : ""}
          </span>
        </span>
      ))}
    </Tag>
  );
}
