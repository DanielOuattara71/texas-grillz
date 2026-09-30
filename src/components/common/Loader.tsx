import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";

interface LoaderProps {
  onComplete: () => void;
}

export function Loader({ onComplete }: LoaderProps) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return Math.min(p + Math.random() * 15 + 5, 100);
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      setTimeout(() => setIsExiting(true), 300);
      setTimeout(onComplete, 800);
    }
  }, [progress, onComplete]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex flex-col items-center justify-center bg-charcoal transition-all duration-500",
        isExiting && "opacity-0 scale-110 pointer-events-none"
      )}
      aria-hidden={isExiting}
    >
      <div className="relative">
        <img
          src="/logo.jpg"
          alt="Texas GrillZ"
          className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover animate-pulse"
        />
        <div className="absolute inset-0 rounded-full border-2 border-gold/30 animate-ping" />
      </div>

      <div className="mt-10 w-48">
        <div className="h-1 bg-cream/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold-deep via-gold to-gold-pale transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-4 text-center font-mono text-xs text-cream/60 tracking-wider">
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}
