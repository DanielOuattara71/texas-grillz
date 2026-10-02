import { type CSSProperties } from "react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Reveal } from "../ui/Reveal";
import { Numeral } from "../ui/Numeral";
import { useContent } from "../../content/store";
import { type Service } from "../../data/services";
import { cn } from "../../utils/cn";

/** Écart vertical entre deux cartes empilées (bande visible de la carte du dessous), en rem. */
const STACK_STEP = 4.5;

function ServiceCard({
  service,
  index,
}: {
  service: Service;
  index: number;
}) {
  const dark = Boolean(service.highlighted);

  return (
    <div
      className="card-stack-item"
      style={
        {
          "--stack-step": `${index * STACK_STEP}rem`,
          zIndex: index + 1,
        } as CSSProperties
      }
    >
      <Reveal variant="up" delay={index * 60}>
        <article
          className={cn(
            "grid grid-cols-1 gap-6 p-7 md:grid-cols-[5.5rem_minmax(0,1fr)_auto] md:items-baseline md:gap-x-10 md:p-10",
            dark ? "card-surface-dark" : "card-surface"
          )}
        >
          <Numeral value={service.number} dark={dark} />

          <h3
            className={cn(
              "display-title text-[clamp(1.35rem,2.4vw,2.1rem)]",
              dark ? "text-cream" : "text-ink"
            )}
          >
            {service.title}
          </h3>

          <a
            href={service.href}
            className={cn(
              "gold-link order-3 justify-self-start inline-flex items-center gap-2 whitespace-nowrap md:order-none md:justify-self-end",
              dark && "text-gold hover:text-gold-pale"
            )}
          >
            Découvrir
            <span aria-hidden="true" className="inline-block transition-transform duration-300">
              ↗
            </span>
          </a>

          <p
            className={cn(
              "order-2 max-w-[52ch] text-[15px] leading-relaxed md:order-none md:col-start-2",
              dark ? "text-smoke" : "text-muted"
            )}
          >
            {service.description}
          </p>
        </article>
      </Reveal>
    </div>
  );
}

export function Services() {
  const { services, texts } = useContent();

  if (services.length === 0) return null;

  return (
    <section id="services" className="section-stack bg-cream pt-12 pb-28 md:pt-16 md:pb-36">
      <Container>
        <SectionHeading
          number={texts.services.number}
          label={texts.services.label}
          title={texts.services.title}
          accent={texts.services.accent}
          subtitle={texts.services.subtitle}
          align="left"
        />

        <div className="card-stack mt-12 md:mt-16">
          {services.map((service, i) => (
            <ServiceCard key={service.id} service={service} index={i} />
          ))}
        </div>
      </Container>
    </section>
  );
}
