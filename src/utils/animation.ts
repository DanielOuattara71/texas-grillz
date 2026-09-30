export const EASE_OUT_EXPO = "cubic-bezier(0.22, 1, 0.36, 1)";

export const DURATION = {
  fast: 200,
  medium: 300,
  slow: 400,
  reveal: 800,
} as const;

export type RevealVariant = "up" | "left" | "right" | "scale" | "blur";

export const VARIANTS: Record<RevealVariant, { from: string; to: string }> = {
  up: {
    from: "opacity: 0; transform: translateY(40px);",
    to: "opacity: 1; transform: translateY(0);",
  },
  left: {
    from: "opacity: 0; transform: translateX(-40px);",
    to: "opacity: 1; transform: translateX(0);",
  },
  right: {
    from: "opacity: 0; transform: translateX(40px);",
    to: "opacity: 1; transform: translateX(0);",
  },
  scale: {
    from: "opacity: 0; transform: scale(0.9);",
    to: "opacity: 1; transform: scale(1);",
  },
  blur: {
    from: "opacity: 0; filter: blur(8px);",
    to: "opacity: 1; filter: blur(0);",
  },
};
