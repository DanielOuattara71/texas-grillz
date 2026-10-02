import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { RevealGroup } from "../ui/RevealGroup";
import { useContent, useHourLines } from "../../content/store";

export function Info() {
  const { address, phone, email, texts } = useContent();
  const hours = useHourLines();
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
          number={texts.info.number}
          label={texts.info.label}
          title={texts.info.title}
          accent={texts.info.accent}
          subtitle={texts.info.subtitle}
          dark
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          <RevealGroup variant="left" stagger={100}>
            <div className="card-surface-dark p-8 md:p-10">
              <h3 className="eyebrow text-gold mb-6">
                Horaires
              </h3>
              <ul className="space-y-4">
                {hours.map((h) => (
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
                <p className="text-cream leading-relaxed">{address}</p>
              </div>
              <div>
                <h3 className="eyebrow text-gold mb-4">
                  Contact
                </h3>
                <ul className="space-y-3">
                  <li>
                    <a
                      href={`tel:${phone.replace(/\s/g, "")}`}
                      className="text-cream hover:text-gold transition-colors duration-200"
                    >
                      {phone}
                    </a>
                  </li>
                  <li>
                    <a
                      href={`mailto:${email}`}
                      className="text-cream hover:text-gold transition-colors duration-200"
                    >
                      {email}
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="eyebrow text-gold mb-4">
                  Réservation
                </h3>
                <p className="text-smoke text-sm leading-relaxed">
                  {texts.info.reservationNote}
                </p>
              </div>
            </div>
          </RevealGroup>
        </div>
      </Container>
    </section>
  );
}
