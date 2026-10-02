import { type Ref } from "react";
import { Reveal } from "./Reveal";
import { useInView } from "../../hooks/useInView";
import { useCountUp } from "../../hooks/useCountUp";
import { type MenuItem } from "../../data/menu";
import { formatPrice } from "../../utils/formatPrice";
import { topOrdered } from "../../utils/menu";
import { cn } from "../../utils/cn";

/** Ligne du classement : barre de volume animée + compteur de commandes. */
function RankRow({
  item,
  index,
  ratio,
}: {
  item: MenuItem;
  index: number;
  ratio: number;
}) {
  const { ref, inView } = useInView({ threshold: 0.5 });
  const orders = useCountUp(item.orders, inView, { duration: 1600 });

  return (
    <li
      ref={ref as Ref<HTMLLIElement>}
      className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 border-t border-cream/10 py-5 first:border-t-0 md:gap-7"
    >
      <span className="numeral-display text-[clamp(1.6rem,3.6vw,2.4rem)] text-gold/35 transition-colors duration-500 group-hover:text-gold">
        {`0${index + 1}`}
      </span>

      <div className="min-w-0">
        <p className="truncate font-display text-[15px] uppercase tracking-[0.06em] text-cream transition-transform duration-[500ms] ease-[var(--ease-out-expo)] group-hover:translate-x-1 group-hover:text-gold">
          {item.name}
        </p>
        <div className="mt-2.5 h-[2px] w-full max-w-sm overflow-hidden rounded-full bg-cream/10">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-gold-deep to-gold transition-[width] duration-[1400ms] ease-[var(--ease-out-expo)]"
            style={{ width: inView ? `${ratio}%` : "0%" }}
          />
        </div>
        <p className="mt-2 text-xs tabular-nums text-smoke">
          {orders} commandes · 30 derniers jours
        </p>
      </div>

      <span className="font-display text-base font-semibold tabular-nums text-gold">
        {formatPrice(item.price)}
      </span>
    </li>
  );
}

/**
 * Classement des plats les plus commandés : chiffres réels (données métier),
 * barres de volume animées à l'entrée dans le viewport.
 */
export function TopOrdered({
  items,
  className,
}: {
  items?: MenuItem[];
  className?: string;
}) {
  const top = topOrdered(5, items);
  const max = top.length > 0 ? top[0].orders : 1;

  if (top.length === 0) return null;

  return (
    <Reveal
      variant="up"
      className={cn("mt-20 border-t border-cream/10 pt-14", className)}
    >
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <span className="font-display text-[11px] uppercase tracking-[0.2em] text-gold">
          Classement
        </span>
        <h3 className="display-title text-[clamp(1.3rem,2.6vw,2rem)] text-cream">
          Les plus commandés
        </h3>
        <span className="section-count text-gold/70">[{top.length} plats]</span>
      </div>

      <ol className="mt-9">
        {top.map((item, index) => (
          <RankRow
            key={item.id}
            item={item}
            index={index}
            ratio={Math.round((item.orders / max) * 100)}
          />
        ))}
      </ol>
    </Reveal>
  );
}
