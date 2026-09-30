import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { RevealGroup } from "../ui/RevealGroup";
import { site } from "../../data/site";

export function Info() {
  return (
    <section id="infos" className="section-stack relative overflow-hidden bg-charcoal py-24 md:py-36">
      {/* Le mur de l'affiche, en fond de page : très présent en haut, estompé ensuite */}
      <div className="brick-wall absolute inset-0 opacity-[0.08]" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-charcoal to-charcoal"
        aria-hidden="true"
      />
      <Container className="relative">
        <SectionHeading
          number="08"
          label="Infos Pratiques"
          title="Nous"
          accent="Trouver"
          subtitle="Horaires, adresse et contact — on vous attend."
          dark
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          <RevealGroup variant="left" stagger={100}>
            <div className="card-surface-dark p-8 md:p-10">
              <h3 className="eyebrow text-gold mb-6">
                Horaires
              </h3>
              <ul className="space-y-4">
                {site.hours.map((h) => (
                  <li
                    key={h.days}
                    className="flex items-center justify-between border-b border-gold/15 pb-4"
                  >
                    <span className="text-cream font-medium">{h.days}</span>
                    <span className="font-display tabular-nums text-gold">
                      {h.time}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </RevealGroup>

          <RevealGroup variant="right" stagger={100}>
            <div className="card-surface-dark space-y-8 p-8 md:p-10">
              <div>
                <h3 className="eyebrow text-gold mb-4">
                  Adresse
                </h3>
                <p className="text-cream leading-relaxed">{site.address}</p>
              </div>
              <div>
                <h3 className="eyebrow text-gold mb-4">
                  Contact
                </h3>
                <ul className="space-y-3">
                  <li>
                    <a
                      href={`tel:${site.phone.replace(/\s/g, "")}`}
                      className="text-cream hover:text-gold transition-colors duration-200"
                    >
                      {site.phone}
                    </a>
                  </li>
                  <li>
                    <a
                      href={`mailto:${site.email}`}
                      className="text-cream hover:text-gold transition-colors duration-200"
                    >
                      {site.email}
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="eyebrow text-gold mb-4">
                  Réservation
                </h3>
                <p className="text-smoke text-sm leading-relaxed">
                  Par téléphone ou en ligne. Réservation recommandée le week-end.
                </p>
              </div>
            </div>
          </RevealGroup>
        </div>
      </Container>
    </section>
  );
}
