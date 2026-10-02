import { useState } from "react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Reveal } from "../ui/Reveal";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { FoodMedia } from "../ui/FoodMedia";
import { photoSlot } from "../../utils/photoSlot";
import { FilterChips } from "../ui/FilterChips";
import { type MenuItem } from "../../data/menu";
import { formatPrice } from "../../utils/formatPrice";
import {
  applyFilter,
  categories,
  filters,
  itemsOf,
  priceSpan,
  topOrdered,
  totalDishes,
  type CategoryId,
  type FilterId,
} from "../../utils/menu";
import { cn } from "../../utils/cn";
import { useContent } from "../../content/store";
import { TopOrdered } from "../ui/TopOrdered";

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
            {formatPrice(item.price)}
          </span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-smoke">
          {item.description}
        </p>
        {item.badge && <Badge variant={item.badge} className="mt-3" />}
      </div>
    </li>
  );
}

/**
 * Le plat le plus commandé en grand format : c'est lui qui donne faim en
 * premier, avant même qu'on ouvre une catégorie.
 */
function SignatureDish({ items }: { items: MenuItem[] }) {
  const dish = topOrdered(1, items)[0];

  // Sans aucun plat (carte vide depuis l'admin), on n'affiche pas de bloc.
  if (!dish) return null;

  return (
    <Reveal variant="up" delay={80}>
      <article className="card-surface-dark mb-14 grid grid-cols-1 overflow-hidden md:grid-cols-2">
        <div className="heat-haze relative aspect-[16/10] bg-coal md:aspect-auto">
          <FoodMedia
            label={dish.name}
            alt={`${dish.name} — ${dish.description}`}
            photo={photoSlot(dish.image)}
            eager
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-coal/75 via-coal/10 to-transparent md:bg-gradient-to-r md:from-transparent md:to-coal/70"
          />
          <span className="price-tag absolute bottom-4 left-4 px-4 py-1.5 font-display text-lg font-semibold tabular-nums">
            {formatPrice(dish.price)}
          </span>
        </div>

        <div className="flex flex-col gap-4 p-7 md:justify-center md:p-10">
          <span className="eyebrow text-gold">Le plus commandé du mois</span>
          <h3 className="display-title text-[clamp(1.7rem,3.4vw,2.6rem)] text-cream">
            {dish.name}
          </h3>
          <p className="font-serif text-[17px] italic leading-relaxed text-cream/80">
            {dish.description}
          </p>
          <p className="font-display text-[11px] uppercase tracking-[0.18em] text-smoke">
            {dish.orders} commandes · 30 derniers jours
          </p>
          <div className="pt-3">
            <Button href="#contact" variant="primary">
              Réserver une table
            </Button>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

export function MenuSection() {
  const [open, setOpen] = useState<CategoryId | null>(categories[0].id);
  const [filter, setFilter] = useState<FilterId>("all");
  const { menu, texts } = useContent();

  return (
    <section id="menu" className="section-stack bg-charcoal py-24 md:py-36">
      <Container>
        <SectionHeading
          number={texts.menu.number}
          label={texts.menu.label}
          title={texts.menu.title}
          accent={texts.menu.accent}
          count={`${totalDishes(menu)} plats`}
          subtitle={texts.menu.subtitle}
          dark
        />

        <SignatureDish items={menu} />

        <Reveal variant="up" delay={120}>
          <FilterChips
            options={filters}
            value={filter}
            onChange={(id) => setFilter(id as FilterId)}
            className="mb-12 justify-center"
          />
        </Reveal>

        <div className="border-b border-cream/10">
          {categories.map((category, i) => {
            const items = applyFilter(itemsOf(category.id, menu), filter);
            const isOpen = open === category.id;

            return (
              <Reveal key={category.id} variant="up" delay={i * 120}>
                <div className="border-t border-cream/10">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`carte-${category.id}`}
                    onClick={() => setOpen(isOpen ? null : category.id)}
                    className="group flex w-full items-baseline gap-4 py-7 text-left md:gap-6"
                  >
                    <span className="w-7 shrink-0 font-display text-xs font-semibold tabular-nums text-gold/85">
                      {`0${i + 1}`}
                    </span>
                    <span className="display-title text-[clamp(1.35rem,3.2vw,2.25rem)] text-cream transition-transform duration-[500ms] ease-[var(--ease-out-expo)] group-hover:translate-x-1.5 group-hover:text-gold">
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
                    id={`carte-${category.id}`}
                    className="collapsible"
                    data-open={isOpen}
                    aria-hidden={!isOpen}
                    inert={!isOpen}
                  >
                    <div>
                      <div className="pb-9 md:pl-[3.25rem]">
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
                            Aucun plat dans ce filtre ici — essayez « Toute la
                            carte ».
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

        <TopOrdered items={menu} />
      </Container>
    </section>
  );
}
