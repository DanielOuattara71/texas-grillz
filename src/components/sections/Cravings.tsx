import { useMemo } from "react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Reveal } from "../ui/Reveal";
import { FoodMedia } from "../ui/FoodMedia";
import { photoSlot } from "../../utils/photoSlot";
import { useContent } from "../../content/store";
import { useLieu } from "../../hooks/useLieu";
import { type Craving } from "../../data/cravings";
import { priceSpan } from "../../utils/menu";
import { formatPrice } from "../../utils/formatPrice";
import { cn } from "../../utils/cn";

/**
 * Tuile d'envie : le visuel du plat occupe toute la place, le prix est collé
 * dessus comme une étiquette, et l'accroche se lit sous la photo.
 * Mobile : les tuiles défilent à la horizontale (`.snap-row`),
 * desktop : grille éditoriale 7/5 puis 3+3+3.
 */
function CravingCard({
  craving,
  wide = false,
  className,
}: {
  craving: Craving;
  wide?: boolean;
  className?: string;
}) {
  const { item } = craving;

  return (
    <Reveal variant="up" className={cn("snap-start shrink-0", className)}>
      <a
        href="#menu"
        className="card-warm group flex h-full flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-deep"
      >
        <div
          className={cn(
            "heat-haze relative overflow-hidden rounded-t-[calc(var(--radius-card)-1px)]",
            wide ? "aspect-[16/10]" : "aspect-[4/3]"
          )}
        >
          <FoodMedia
            label={item.name}
            alt={`${item.name}, ${item.description}`}
            photo={photoSlot(item.image)}
            video={craving.video}
            eager={Boolean(craving.featured)}
          />

          {/* Liseré chaud en bas du visuel : le prix reste lisible */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-cocoa/55 to-transparent"
          />

          {craving.stamp ? (
            <span className="stamp-ink absolute left-3 top-3 -rotate-2 bg-shell/90 px-2 py-[3px] text-[10px] leading-none text-signal-deep">
              {craving.stamp}
            </span>
          ) : null}

          <span className="price-tag absolute bottom-3 right-3 px-3 py-1 font-display text-[15px] font-semibold tabular-nums">
            {formatPrice(item.price)}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-5">
          <span className="eyebrow text-glaze">{craving.kicker}</span>
          <h3 className="display-title text-[clamp(1.15rem,2.2vw,1.9rem)] text-ink">
            {item.name}
          </h3>
          <p className="font-serif text-[15px] italic leading-relaxed text-cocoa/80">
            {craving.hook}
          </p>
          <span className="gold-link mt-auto inline-flex items-center gap-2 pt-3">
            Voir la carte
            <span aria-hidden="true">↗</span>
          </span>
        </div>
      </a>
    </Reveal>
  );
}

/**
 * Section « Envies » : la rupture chaude après le noir de l'affiche.
 * C'est la partie qui donne envie de manger — photographies, prix, accroches.
 */
export function Cravings() {
  // Les envies sont resoutes sur la carte du restaurant choisi (`?lieu=`),
  // sinon sur la carte commune.
  const { cravings, menu, menuByLocation, locations, texts } = useContent();
  const { lieu } = useLieu(locations[0]?.id ?? null);
  const chosenMenu = useMemo(() => {
    // Association stricte : si `<id>:menu` existe, on l'utilise exclusivement.
    if (lieu && Object.hasOwn(menuByLocation, lieu)) return menuByLocation[lieu] ?? [];
    const first = locations[0];
    if (first && Object.hasOwn(menuByLocation, first.id)) return menuByLocation[first.id] ?? [];
    return menu;
  }, [lieu, menu, menuByLocation, locations]);
  const resolvedCravings = useMemo(() => {
    const byId = new Map(chosenMenu.map((i) => [i.id, i]));
    return cravings
      .map((c) => {
        const item = byId.get(c.item.id);
        if (!item) return null;
        return { ...c, item };
      })
      .filter(Boolean) as typeof cravings;
  }, [cravings, chosenMenu]);

  if (resolvedCravings.length === 0) return null;

  const featured = resolvedCravings.find((craving) => craving.featured) ?? resolvedCravings[0];
  const rest = resolvedCravings.filter((craving) => craving.id !== featured.id);

  return (
    <section
      id="envies"
      className="section-stack relative overflow-hidden bg-peach py-24 md:py-32"
    >
      <div className="warm-bloom pointer-events-none absolute inset-0" aria-hidden="true" />

      <Container className="relative">
        <SectionHeading
          number={texts.cravings.number}
          label={texts.cravings.label}
          title={texts.cravings.title}
          accent={texts.cravings.accent}
          count={`${resolvedCravings.length} plats`}
          subtitle={texts.cravings.subtitle}
          align="left"
          className="mb-12 md:mb-16"
        />

        <div className="snap-row lg:grid lg:grid-cols-12 lg:gap-5">
          <CravingCard
            craving={featured}
            wide
            className="w-[82%] max-w-[430px] sm:w-[48%] lg:col-span-7 lg:w-auto lg:max-w-none"
          />
          <CravingCard
            craving={rest[0]}
            className="w-[82%] max-w-[430px] sm:w-[48%] lg:col-span-5 lg:w-auto lg:max-w-none"
          />
          {rest.slice(1).map((craving) => (
            <CravingCard
              key={craving.id}
              craving={craving}
              className="w-[70%] max-w-[320px] sm:w-[38%] lg:col-span-3 lg:w-auto lg:max-w-none"
            />
          ))}
        </div>

        <Reveal variant="up" delay={160}>
          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-card border border-cocoa/12 bg-shell/80 px-6 py-5 sm:flex-row sm:items-center">
            <p className="text-[15px] leading-relaxed text-cocoa/85">
              <span className="eyebrow mr-3 text-glaze">Toute la carte</span>
              {chosenMenu.length} plats et accompagnements, de {priceSpan(chosenMenu)},
              cuisinés le matin même, servis jusqu'au dernier morceau.
            </p>
            <a
              href="#menu"
              className="gold-link inline-flex shrink-0 items-center gap-2 whitespace-nowrap"
            >
              Découvrir la carte
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
