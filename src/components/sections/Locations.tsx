import { type CSSProperties } from "react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Numeral } from "../ui/Numeral";
import { AvailabilityPill } from "../ui/AvailabilityPill";
import { FoodMedia } from "../ui/FoodMedia";
import { useContent } from "../../content/store";
import {
  formatCompactHours,
  getAvailability,
} from "../../utils/availability";
import { telHref } from "../../utils/phone";
import { setLieu } from "../../hooks/useLieu";
import { Button } from "../ui/Button";
import { Magnetic } from "../ui/Magnetic";

/** Écart vertical entre deux cartes empilées (bande visible de la carte du dessous), en rem. */
const STACK_STEP = 3.5;

export function Locations() {
  const { locations, locationHours, texts } = useContent();

  if (locations.length === 0) return null;
  return (
    <section id="lieux" className="section-stack bg-cream pb-28 md:pb-36">
      <Container className="pt-24 md:pt-36">
        <SectionHeading
          number={texts.locations.number}
          label={texts.locations.label}
          title={texts.locations.title}
          accent={texts.locations.accent}
          count={`${locations.length} adresses`}
          subtitle={texts.locations.subtitle}
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
                      <AvailabilityPill
                        {...getAvailability(
                          locationHours[location.id] ?? location.schedule!
                        )}
                      />
                    </div>
                    <h3 className="display-title mt-3 text-[clamp(1.4rem,3vw,2.1rem)] text-cream">
                      {location.name}
                    </h3>

                    <div className="mt-6 space-y-3">
                      <p className="flex items-start gap-3 text-sm text-cream/70">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-gold"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {location.address}
                      </p>
                      <p className="flex items-start gap-3 text-sm text-cream/70">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-gold"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                        {location.hours ??
                          formatCompactHours(
                            locationHours[location.id] ?? location.schedule!
                          )}
                      </p>
                      <p className="flex items-start gap-3 text-sm text-cream/70">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-gold"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 10.91a16 16 0 0 0 6 6l2.27-1.27a2 2 0 0 1 2.11.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        <a
                          href={telHref(location.phone)}
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
                        <button
                          type="button"
                          onClick={() => {
                            setLieu(location.id);
                            // La section Carte affiche le restaurant choisi (onglet).
                            document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="rounded-card border border-cream/25 px-5 py-3 font-display text-[11px] uppercase tracking-[0.14em] text-cream transition-colors hover:border-gold hover:text-gold"
                        >
                          Voir la carte de ce restaurant
                        </button>
                      </Magnetic>
                      <Magnetic>
                        <Button href="#contact" variant="primary">
                          Réserver
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
