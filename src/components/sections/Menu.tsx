import { useState } from "react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Reveal } from "../ui/Reveal";
import { Button } from "../ui/Button";
import { FoodMedia } from "../ui/FoodMedia";
import { photoSlot } from "../../utils/photoSlot";
import { type MenuItem } from "../../data/menu";
import { formatPrice } from "../../utils/formatPrice";
import {
  categories as fallbackCategories,
  dishesForLocation,
  priceSpan,
  totalDishes,
} from "../../utils/menu";
import { cn } from "../../utils/cn";
import { useContent } from "../../content/store";
import { useLieu } from "../../hooks/useLieu";
import type { Location } from "../../data/locations";

function displayPrice(item: MenuItem): string {
  const formatted = formatPrice(item.price);
  return item.priceFrom ? `dès ${formatted}` : formatted;
}

/** Ligne de plat : visuel dévoilé en volet (clip-path) + zoom lent au survol. */
function DishRow({ item, index }: { item: MenuItem; index: number }) {
  return (
    <li className="group/item flex items-start gap-4 border-t border-cream/10 py-5 first:border-t-0 first:pt-0 sm:gap-6">
      <div
        className="menu-reveal h-[4.5rem] w-24 shrink-0 overflow-hidden rounded-[10px] bg-coal sm:h-[5.5rem] sm:w-32"
        style={{ transitionDelay: `${index * 70}ms` }}
      >
        <FoodMedia
          label={item.name}
          alt={item.name}
          photo={photoSlot(item.image)}
          className="transition-transform duration-[6000ms] ease-out group-hover/item:scale-[1.18]"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <h4 className="font-display text-[15px] uppercase tracking-[0.06em] text-cream transition-colors duration-300 group-hover/item:text-gold">
            {item.name}
          </h4>
          <span
            aria-hidden="true"
            className="hidden h-px flex-1 bg-cream/12 sm:block"
          />
          <span className="font-display text-base font-semibold tabular-nums text-gold">
            {displayPrice(item)}
          </span>
        </div>
        {item.description && (
          <p className="mt-1.5 text-sm leading-relaxed text-smoke">
            {item.description}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Carte d'un seul restaurant : en-tête + catégories dépliables.
 * Un plat appartient à ce restaurant car il figure dans sa carte.
 */
function RestaurantMenu({
  location,
  dishes,
  categories,
}: {
  location: Location;
  dishes: MenuItem[];
  categories: { id: string; label: string; note: string; sort: number }[];
}) {
  const sorted = [...categories].sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label));
  const [open, setOpen] = useState<string | null>(sorted[0]?.id ?? null);
  const count = totalDishes(dishes);

  return (
    <article id={`menu-${location.id}`} className="scroll-mt-28">
      <header className="mb-6 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="display-title text-[clamp(1.4rem,3vw,2.1rem)] text-cream">
              {location.name.replace("Texas GrillZ, ", "")}
            </h3>
            <span className="section-count text-gold/85">[{count} plats]</span>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-smoke">{location.address}</p>
        </div>
        {count > 0 && (
          <p className="text-xs uppercase tracking-[0.16em] text-ash">
            {dishes[0] && (<>Prix en FCFA · {`${count} plats`}</>)}
          </p>
        )}
      </header>

      <div className="border-b border-cream/10">
        {sorted.map((category, i) => {
          const items = dishes.filter((d) => d.category === category.id);
          const isOpen = open === category.id;
          return (
            <Reveal key={category.id} variant="up" delay={Math.min(i * 60, 300)}>
              <div className="border-t border-cream/10">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`carte-${location.id}-${category.id}`}
                  onClick={() => setOpen(isOpen ? null : category.id)}
                  className="group flex w-full items-baseline gap-4 py-6 text-left md:gap-6"
                >
                  <span className="w-7 shrink-0 font-display text-xs font-semibold tabular-nums text-gold/85">
                    {`0${i + 1}`}
                  </span>
                  <span className="display-title text-[clamp(1.25rem,2.8vw,1.9rem)] text-cream transition-transform duration-[500ms] ease-[var(--ease-out-expo)] group-hover:translate-x-1.5 group-hover:text-gold">
                    {category.label}
                  </span>
                  <span className="section-count hidden shrink-0 text-gold/85 sm:inline">
                    [{items.length}]
                  </span>
                  <span className="ml-auto hidden shrink-0 font-sans text-sm tabular-nums text-smoke md:inline">
                    {priceSpan(items)}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "shrink-0 font-display text-xl leading-none text-gold transition-transform duration-[450ms] ease-[var(--ease-out-expo)]",
                      isOpen ? "rotate-45" : "group-hover:rotate-90"
                    )}
                  >
                    +
                  </span>
                </button>

                <div
                  id={`carte-${location.id}-${category.id}`}
                  className="collapsible"
                  data-open={isOpen}
                  aria-hidden={!isOpen}
                  inert={!isOpen}
                >
                  <div>
                    <div className="pb-8 md:pl-[3.25rem]">
                      <p className="mb-5 max-w-xl font-serif text-[15px] italic leading-relaxed text-smoke">
                        {category.note}
                      </p>
                      {items.length > 0 ? (
                        <ul>
                          {items.map((item, index) => (
                            <DishRow key={item.id} item={item} index={index} />
                          ))}
                        </ul>
                      ) : (
                        <p className="py-4 text-sm text-smoke">
                          Aucun plat pour ce restaurant dans cette catégorie.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </article>
  );
}

export function MenuSection() {
  const { menu, menuByLocation, locations, categoriesByLocation, texts } = useContent();

  // Un plat est associé à un restaurant via son `restoID` (`locationIds`/
  // `locationId`) et/ou sa présence dans `menuByLocation[<id>]`.
  // Si le backend a une entrée pour ce restaurant (même vide), on l'utilise
  // exclusivement. Sinon on filtre la carte commune sur `restoID`.
  const menusByLocation = locations.map((location) => {
    const hasOwn = Object.hasOwn(menuByLocation, location.id);
    const own = hasOwn ? menuByLocation[location.id] : undefined;
    const base = Array.isArray(own) ? own : menu;
    const dishes = dishesForLocation(location.id, base);
    const categories =
      (categoriesByLocation && categoriesByLocation[location.id]) ||
      fallbackCategories.map((c, index) => ({ id: c.id, label: c.label, note: c.note, sort: index + 1 }));
    return { location, dishes, categories };
  });

  const total = menusByLocation.reduce((sum, e) => sum + totalDishes(e.dishes), 0);
  const defaultLieu = locations[0]?.id ?? null;
  const { lieu: active, choose } = useLieu(defaultLieu);
  const activeLocation = locations.find((l) => l.id === active) ?? locations[0] ?? null;
  const activeEntry = menusByLocation.find((e) => e.location.id === activeLocation?.id);

  if (locations.length === 0) return null;

  return (
    <section id="menu" className="section-stack bg-charcoal py-24 md:py-36">
      <Container>
        <SectionHeading
          number={texts.menu.number}
          label={texts.menu.label}
          title={texts.menu.title}
          accent={texts.menu.accent}
          count={`${total} plats, ${menusByLocation.length} restaurants`}
          subtitle={texts.menu.subtitle}
          dark
        />

        {/* Sélecteur par restaurant : `?lieu=<id>` partagé avec Lieux/Envies/Contact. */}
        <div className="mb-8 -mt-6 flex flex-wrap items-center gap-2" role="tablist" aria-label="Choisir un restaurant">
          {menusByLocation.map(({ location, dishes }) => {
            const isActive = activeLocation?.id === location.id;
            return (
              <button
                key={location.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`menu-${location.id}`}
                id={`tab-${location.id}`}
                onClick={() => choose(location.id)}
                className={cn(
                  "inline-flex flex-wrap items-baseline gap-x-2 rounded-full border px-4 py-2 font-display text-[11px] uppercase tracking-[0.14em] transition-colors",
                  isActive
                    ? "border-gold bg-gold text-coal"
                    : "border-cream/20 text-smoke hover:border-gold hover:text-gold"
                )}
              >
                <span className="font-semibold">{location.name.replace("Texas GrillZ, ", "")}</span>
                <span className={cn("tabular-nums", isActive ? "text-coal/70" : "text-gold/80")}>
                  [{totalDishes(dishes)} plats]
                </span>
              </button>
            );
          })}
        </div>

        {activeEntry ? (
          <div role="tabpanel" aria-labelledby={`tab-${activeEntry.location.id}`}>
            <RestaurantMenu
              location={activeEntry.location}
              dishes={activeEntry.dishes}
              categories={activeEntry.categories}
            />
          </div>
        ) : (
          <RestaurantMenu
            location={locations[0]}
            dishes={menusByLocation[0]?.dishes ?? []}
            categories={menusByLocation[0]?.categories ?? fallbackCategories.map((c, index) => ({ id: c.id, label: c.label, note: c.note, sort: index + 1 }))}
          />
        )}

        <div className="mt-14 text-center">
          <Button href="#contact" variant="primary">
            Réserver une table
          </Button>
        </div>
      </Container>
    </section>
  );
}
