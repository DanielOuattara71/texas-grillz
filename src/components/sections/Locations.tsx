import { type CSSProperties } from "react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Numeral } from "../ui/Numeral";
import { AvailabilityPill } from "../ui/AvailabilityPill";
import { FoodMedia } from "../ui/FoodMedia";
import { locations } from "../../data/locations";
import { standardSchedule } from "../../data/hours";
import {
  formatCompactHours,
  getAvailability,
} from "../../utils/availability";
import { Button } from "../ui/Button";
import { Magnetic } from "../ui/Magnetic";

/** Écart vertical entre deux cartes empilées (bande visible de la carte du dessous), en rem. */
const STACK_STEP = 3.5;

export function Locations() {
  return (
    <section id="lieux" className="section-stack bg-cream pb-28 md:pb-36">
      <Container className="pt-24 md:pt-36">
        <SectionHeading
          number="05"
          label="Nos Lieux"
          title="Nos sites"
          accent="en Métropole"
          count={`${locations.length} adresses`}
          subtitle="Trois tables ouvertes, une quatrième en cours d'installation. Trouvez le Texas GrillZ le plus proche de chez vous."
        />

        <div className="card-stack mt-12 md:mt-16">
          {locations.map((location, i) => (
            <div
              key={location.id}
              className="card-stack-item"
              style={
                {
                  "--stack-step": `${i * STACK_STEP}rem`,
                  zIndex: i + 1,
                } as CSSProperties
              }
            >
              <div className="card-surface-dark overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[400px]">
                    <FoodMedia
                      label={location.name}
                      alt={location.name}
                      photo={location.image}
                      eager={i === 0}
                      className={
                        location.status === "bientot"
                          ? "opacity-60 grayscale-[0.75]"
                          : undefined
                      }
                    />
                    <div className="absolute inset-0 hidden bg-gradient-to-r from-transparent to-coal/60 md:block" />
                    {/* Grillage de l'affiche, posé sur la photo du site */}
                    <div
                      className="fence-mesh pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-screen"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="flex flex-col justify-center p-8 md:p-12">
                    <div className="flex flex-wrap items-center gap-4">
                      <Numeral value={location.number} dark />
                      {location.status === "bientot" ? (
                        <AvailabilityPill
                          label="Ouverture"
                          detail="automne 2026"
                          tone="closed"
                        />
                      ) : (
                        <AvailabilityPill
                          {...getAvailability(
                            location.schedule ?? standardSchedule
                          )}
                        />
                      )}
                    </div>
                    <h3 className="display-title mt-3 text-[clamp(1.4rem,3vw,2.1rem)] text-cream">
                      {location.name}
                    </h3>

                    <div className="mt-6 space-y-3">
                      <p className="flex items-start gap-3 text-sm text-cream/70">
                        <span className="text-gold">📍</span>
                        {location.address}
                      </p>
                      <p className="flex items-start gap-3 text-sm text-cream/70">
                        <span className="text-gold">🕐</span>
                        {location.hours ??
                          formatCompactHours(
                            location.schedule ?? standardSchedule
                          )}
                      </p>
                      <p className="flex items-start gap-3 text-sm text-cream/70">
                        <span className="text-gold">📞</span>
                        <a
                          href={`tel:${location.phone.replace(/\s/g, "")}`}
                          className="hover:text-gold transition-colors"
                        >
                          {location.phone}
                        </a>
                      </p>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <Magnetic>
                        <Button
                          href={location.mapsUrl}
                          variant="secondary"
                          className="border-cream/25 text-cream hover:border-gold hover:text-gold"
                        >
                          Itinéraire
                        </Button>
                      </Magnetic>
                      <Magnetic>
                        <Button href="#contact" variant="primary">
                          {location.status === "bientot"
                            ? "Être informé de l'ouverture"
                            : "Réserver"}
                        </Button>
                      </Magnetic>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
