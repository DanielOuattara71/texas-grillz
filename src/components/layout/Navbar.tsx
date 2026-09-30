import { useState, useEffect } from "react";
import { useScrollY } from "../../hooks/useScrollY";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { navLinks } from "../../data/site";
import { cn } from "../../utils/cn";

interface NavbarProps {
  onNavigate?: (page: string) => void;
  homeOnly?: boolean;
}

export function Navbar({ onNavigate, homeOnly = false }: NavbarProps) {
  const scrollY = useScrollY();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [menuOpen, setMenuOpen] = useState(false);

  const isScrolled = scrollY > 50;

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <header className="fixed top-4 left-0 right-0 z-50 px-4 md:px-6">
        <nav
          className={cn(
            "mx-auto flex items-center justify-between transition-all duration-500 ease-out rounded-full",
            homeOnly
              ? "max-w-md px-6"
              : "max-w-[1280px] px-6 md:px-10 rounded-2xl",
            isScrolled
              ? homeOnly
                ? "bg-charcoal/95 backdrop-blur-xl border border-cream/10 h-10 shadow-2xl shadow-charcoal/30 scale-90"
                : "bg-charcoal/95 backdrop-blur-xl border border-cream/10 h-14 shadow-2xl shadow-charcoal/30"
              : homeOnly
                ? "bg-charcoal/90 backdrop-blur-md border border-cream/10 h-14"
                : "bg-charcoal/90 backdrop-blur-md border border-cream/10 h-16"
          )}
        >
          <button
            onClick={() => homeOnly && onNavigate?.("home")}
            className="flex items-center gap-3 cursor-pointer mx-auto"
            aria-label="Retour à l'accueil"
          >
            <img
              src="/logo.jpg"
              alt="Texas GrillZ"
              className="w-9 h-9 rounded-full object-cover"
            />
            <span className="font-display font-bold text-lg text-cream tracking-tight">
              Texas <span className="font-serif font-normal italic normal-case text-gold">GrillZ</span>
            </span>
          </button>

          {!homeOnly && !isMobile && (
            <div className="flex items-center gap-8">
              <ul className="flex items-center gap-7">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="relative text-sm font-medium text-cream/70 hover:text-cream transition-colors duration-200 py-2 after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-gold after:scale-x-0 after:origin-left hover:after:scale-x-100 after:transition-transform after:duration-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => onNavigate?.("histoire")}
                    className="relative text-sm font-medium text-cream/70 hover:text-cream transition-colors duration-200 py-2 after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-gold after:scale-x-0 after:origin-left hover:after:scale-x-100 after:transition-transform after:duration-300"
                  >
                    Notre Histoire
                  </button>
                </li>
              </ul>
              <a
                href="#contact"
                className="bg-gold text-coal text-sm font-semibold px-6 py-2.5 rounded-full uppercase tracking-wide hover:bg-gold-pale hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shadow-lg shadow-gold/20"
              >
                Réserver
              </a>
            </div>
          )}

          {isMobile && (
            <button
              onClick={() => setMenuOpen(true)}
              className="flex items-center gap-2 text-cream text-sm font-medium"
              aria-label="Ouvrir le menu"
            >
              <span>Menu</span>
              <div className="flex flex-col gap-1.5">
                <span className="w-6 h-0.5 bg-cream" />
                <span className="w-4 h-0.5 bg-cream" />
              </div>
            </button>
          )}
        </nav>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-[60] transition-all duration-300",
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <div
          className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
        <div
          className={cn(
            "absolute top-0 right-0 h-full w-full max-w-sm bg-charcoal transition-transform duration-300",
            menuOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between p-5 border-b border-cream/10">
            <span className="font-display font-bold text-cream">
              Texas <span className="font-serif font-normal italic normal-case text-gold">GrillZ</span>
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-10 h-10 rounded-full border border-cream/20 flex items-center justify-center text-cream hover:border-gold hover:text-gold transition-colors"
              aria-label="Fermer le menu"
            >
              ✕
            </button>
          </div>

          <nav className="p-6">
            <ul className="flex flex-col gap-1">
              {navLinks.map((link, i) => (
                <li
                  key={link.href}
                  className={cn(
                    "transition-all duration-300",
                    menuOpen ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
                  )}
                  style={{ transitionDelay: `${i * 50 + 100}ms` }}
                >
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-4 text-xl font-display text-cream/80 hover:text-gold hover:translate-x-2 transition-all duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li
                className={cn(
                  "transition-all duration-300",
                  menuOpen ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
                )}
                style={{ transitionDelay: `${navLinks.length * 50 + 100}ms` }}
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate?.("histoire");
                  }}
                  className="block py-4 text-xl font-display text-cream/80 hover:text-gold hover:translate-x-2 transition-all duration-200 text-left"
                >
                  Notre Histoire
                </button>
              </li>
            </ul>

            <div
              className={cn(
                "mt-8 transition-all duration-300",
                menuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              )}
              style={{ transitionDelay: "350ms" }}
            >
              <a
                href="#contact"
                onClick={() => setMenuOpen(false)}
                className="block bg-gold text-coal text-center font-semibold px-6 py-4 rounded-full uppercase tracking-wide"
              >
                Réserver une table
              </a>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
