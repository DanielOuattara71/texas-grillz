import { useEffect, useState } from "react";
import { useContent } from "../../content/store";
import { telHref, whatsappHref } from "../../utils/phone";
import { cn } from "../../utils/cn";

/**
 * Barre d'action mobile : « Appeler » + « WhatsApp » + « Réserver », les
 * conversions qui comptent sur petit écran.
 * - apparaît après le Hero ;
 * - s'efface quand la section Contact est visible (pas de doublon) ;
 * - respecte l'encoche des iPhone (safe-area).
 */
export function MobileActionBar() {
  const [visible, setVisible] = useState(false);
  const { phone } = useContent();

  useEffect(() => {
    const contact = document.getElementById("contact");
    let contactVisible = false;

    const sync = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.7;
      setVisible(pastHero && !contactVisible);
    };

    const observer = contact
      ? new IntersectionObserver(
          ([entry]) => {
            contactVisible = entry.isIntersecting;
            sync();
          },
          { threshold: 0.2 }
        )
      : null;

    if (contact && observer) observer.observe(contact);
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 grid grid-cols-3 gap-2.5 border-t border-gold/25",
        "bg-coal/95 p-3 backdrop-blur-md transition-transform duration-500 ease-out md:hidden",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        visible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <a
        href={telHref(phone)}
        className="flex flex-col items-center justify-center rounded-full border border-cream/25 px-4 py-3 text-cream transition-colors duration-200 active:border-gold active:text-gold"
      >
        <span className="font-display text-[11px] uppercase tracking-[0.16em]">
          Appeler
        </span>
        <span className="font-sans text-[11px] text-smoke">{phone}</span>
      </a>
      <a
        href={whatsappHref(phone, "Bonjour, je souhaite réserver une table chez Texas GrillZ.")}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center rounded-full border border-cream/25 px-4 py-3 text-cream transition-colors duration-200 active:border-gold active:text-gold"
      >
        <span className="font-display text-[11px] uppercase tracking-[0.16em]">
          WhatsApp
        </span>
        <span className="font-sans text-[11px] text-smoke">Écrire</span>
      </a>
      <a
        href="#contact"
        className="flex flex-col items-center justify-center rounded-full bg-signal-bright px-4 py-3 text-coal transition-transform duration-200 active:scale-[0.97]"
      >
        <span className="font-display text-[11px] uppercase tracking-[0.16em]">
          Réserver
        </span>
        <span className="font-sans text-[11px] opacity-75">en 30 secondes</span>
      </a>
    </div>
  );
}
