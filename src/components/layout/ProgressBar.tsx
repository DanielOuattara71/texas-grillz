import { useScrollY } from "../../hooks/useScrollY";

export function ProgressBar() {
  const scrollY = useScrollY();

  const progress = Math.min(
    (scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100,
    100
  );

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-cream/5">
      <div
        className="h-full bg-gradient-to-r from-gold-deep via-gold to-gold-pale transition-[width] duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
