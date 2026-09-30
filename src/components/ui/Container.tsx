import { type ReactNode } from "react";
import { cn } from "../../utils/cn";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}

export function Container({ children, className, wide = false }: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 md:px-10",
        wide ? "max-w-[1440px]" : "max-w-[1280px]",
        className
      )}
    >
      {children}
    </div>
  );
}
