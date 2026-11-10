import { useContent, useHourLines } from "../../content/store";
import { mediaUrl } from "../../utils/photoSlot";
import { telHref } from "../../utils/phone";
import { Container } from "../ui/Container";

interface FooterProps {
  onNavigate?: (page: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const { address, phone, email, tagline, established, social, navLinks, visuals, locations } = useContent();
  const hours = useHourLines();
  return (
    <footer className="relative overflow-hidden bg-charcoal text-cream">
      {/* Brique très discrète : l'écho du mur d'affiche, sous le pied de page */}
      <div className="brick-wall absolute inset-0 opacity-[0.06]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-charcoal via-charcoal/92 to-charcoal" aria-hidden="true" />
      <Container className="relative pb-28 pt-16 md:pb-24 md:pt-24">
        <div className="flex flex-col items-center text-center mb-16">
          <img
            src={mediaUrl(visuals.logo?.src || "/logo.jpg")}
            alt="Texas GrillZ"
            className="w-56 h-56 md:w-80 md:h-80 rounded-full object-cover shadow-2xl shadow-gold/25 mb-8"
          />
          <span className="display-title text-5xl font-semibold md:text-7xl">
            Texas{" "}
            <span className="brush-chip px-3 font-serif text-[0.78em] font-normal italic normal-case text-cream">
              GrillZ
            </span>
          </span>
          <p className="text-smoke mt-3 text-sm">{tagline}. Depuis {established}.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 mb-16">
          <div>
            <h3 className="eyebrow text-gold mb-6">
              Navigation
            </h3>
            <ul className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-smoke hover:text-cream text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <button
                  onClick={() => onNavigate?.("histoire")}
                  className="text-smoke hover:text-cream text-sm transition-colors duration-200"
                >
                  Notre Histoire
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="eyebrow text-gold mb-6">
              Contact
            </h3>
            <ul className="flex flex-col gap-3 text-sm">
              {locations.map((loc) => (
                <li key={loc.id} className="text-smoke">
                  <span className="text-cream">{loc.name.replace(/^Texas GrillZ, /, "")}</span>
                  {" — "}
                  {loc.address}{" "}
                  <a href={telHref(loc.phone)} className="hover:text-cream transition-colors duration-200">
                    {loc.phone}
                  </a>
                </li>
              ))}
              {locations.length === 0 && <li className="text-smoke">{address}</li>}
              <li>
                <a href={telHref(phone)} className="text-smoke hover:text-cream transition-colors duration-200">
                  {phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${email}`} className="text-smoke hover:text-cream transition-colors duration-200">
                  {email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="eyebrow text-gold mb-6">
              Horaires
            </h3>
            <ul className="flex flex-col gap-3 text-sm">
              {hours.map((h) => (
                <li key={h.days} className="flex justify-between gap-4">
                  <span className="text-smoke">{h.days}</span>
                  <span className="font-display tabular-nums text-gold">
                    {h.time}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-cream/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-ash text-xs">
            © {new Date().getFullYear()} Texas GrillZ. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6">
            {Object.entries(social).map(([name, url]) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ash hover:text-gold text-xs uppercase tracking-wider transition-colors duration-200"
              >
                {name}
              </a>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}
