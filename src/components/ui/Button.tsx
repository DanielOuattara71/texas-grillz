import { type ReactNode, type ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

type ButtonVariant = "primary" | "secondary" | "tertiary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  href?: string;
}

const base =
  "inline-flex items-center justify-center gap-2 font-semibold tracking-wide transition-all duration-300 cursor-pointer";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-signal-bright text-coal px-8 py-4 text-sm uppercase rounded-card shadow-lg shadow-signal/30 hover:bg-signal hover:text-cream hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-bright",
  secondary:
    "border border-cream/25 text-cream px-8 py-4 text-sm uppercase rounded-card hover:border-gold hover:text-gold hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-gold/20",
  tertiary:
    "text-gold underline-offset-4 hover:underline text-sm uppercase",
};

export function Button({ children, variant = "primary", href, className, ...props }: ButtonProps) {
  const classes = cn(base, variants[variant], className);

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
