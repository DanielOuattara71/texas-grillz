/**
 * Suivi des demandes de réservation — espace de supervision.
 *
 * Vue globale et temps réel du back-office : indicateurs du périmètre courant,
 * filtres restaurant / date / période / statut (combinables), tableau
 * paginé, fiche détaillée au clic. Un gérant ne voit que son restaurant
 * (restriction côté API, jamais côté client).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError, type Reservation, type AdminRestaurantRecord } from "./api";
import { Card, Notice, Select, TextInput } from "./ui";
import { can } from "./permissions";
import { useSession } from "./SessionContext";
import { useContent } from "../content/store";
import { cn } from "../utils/cn";

const STATUSES = [
  { id: "nouvelle", label: "Nouvelle" },
  { id: "confirmee", label: "Confirmée" },
  { id: "annulee", label: "Annulée" },
  { id: "traitee", label: "Traitée" },
] as const;

const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]));

const frenchDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const frenchTime = (time: string | undefined) => (time ? time.replace(":", "h") : "—");

const stamp = (iso: string) => {
  const date = new Date(iso.replace(" ", "T") + "Z");
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const PAGE_SIZE = 25;

function pageWindow(current: number, count: number): number[] {
  const span = 5;
  const half = Math.floor(span / 2);
  let start = Math.max(1, current - half);
  start = Math.min(start, Math.max(1, count - span + 1));
  const end = Math.min(count, start + span - 1);
  const pages: number[] = [];
  for (let p = start; p <= end; p += 1) pages.push(p);
  return pages;
}

export function ReservationsScreen({ locationId }: { locationId?: string | null }) {
  const { user } = useSession();
  const { locations } = useContent();
  const isSuper = user?.role === "super_admin";
  const readOnly = !can(user, "reservations.write");
  const canExport = can(user, "reservations.export");

  const [rows, setRows] = useState<Reservation[] | null>(null);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, today: 0, nouvelle: 0, confirmee: 0, annulee: 0 });
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [restaurants, setRestaurants] = useState<AdminRestaurantRecord[]>([]);
  const [status, setStatus] = useState("");
  const [locFilter, setLocFilter] = useState("");
  const [date, setDate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Reservation | null>(null);

  // La liste du filtre Restaurants vient de la table (pas seulement des visibles).
  useEffect(() => {
    let alive = true;
    if (!isSuper) return;
    api
      .adminRestaurants()
      .then((data) => {
        if (alive) setRestaurants(data.restaurants);
      })
      .catch(() => {
        // Sans API : les adresses livrées suffisent.
      });
    return () => {
      alive = false;
    };
  }, [isSuper]);

  const restaurantName = useMemo(() => {
    const names = new Map<string, string>();
    for (const l of locations) names.set(l.id, l.name);
    for (const r of restaurants) names.set(r.id, r.name);
    return (id: string | null | undefined) => (id ? names.get(id) ?? id : "—");
  }, [locations, restaurants]);

  const activeLocation = isSuper ? (locFilter || locationId || undefined) : (locationId || undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.reservations({
        status: status || undefined,
        q: search || undefined,
        location: activeLocation,
        date: date || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setRows(data.rows);
      setTotal(data.total);
      setStats(data.stats);
      setByStatus(data.byStatus);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [status, search, activeLocation, date, dateFrom, dateTo, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [status, search, activeLocation, date, dateFrom, dateTo]);

  // Échappe ferme la fiche détail.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const filtered = loading || rows === null ? [] : rows;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(total, safePage * PAGE_SIZE);

  async function changeStatus(id: number, next: string) {
    setRows((current) => (current ?? []).map((row) => (row.id === id ? { ...row, status: next } : row)));
    setSelected((current) => (current && current.id === id ? { ...current, status: next } : current));
    try {
      await api.setReservationStatus(id, next);
      void load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Modification impossible.");
      void load();
    }
  }

  function resetFilters() {
    setStatus("");
    setLocFilter("");
    setDate("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setPage(1);
  }

  const statsCards = [
    { label: "Total", value: stats.total, tone: "cream" },
    { label: "Aujourd'hui", value: stats.today, tone: "gold" },
    { label: "En attente", value: stats.nouvelle, tone: "caution" },
    { label: "Confirmées", value: stats.confirmee, tone: "cream" },
    { label: "Annulées", value: stats.annulee, tone: "signal" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* ── Indicateurs du périmètre courant ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statsCards.map((card) => (
          <div
            key={card.label}
            className="rounded-card border border-cream/10 bg-black/20 px-4 py-3"
          >
            <p className="font-display text-[10px] uppercase tracking-[0.18em] text-smoke">
              {card.label}
            </p>
            <p
              className={cn(
                "mt-1 font-display text-2xl tabular-nums leading-none",
                card.tone === "gold" && "text-gold",
                card.tone === "caution" && "text-caution",
                card.tone === "signal" && "text-signal-bright"
              )}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <Card
        title="Réservations"
        description="Vue globale de supervision. Un gérant ne voit que son restaurant."
        action={
          canExport ? (
            <a
              href={api.reservationsCsvUrl({
                status: status || undefined,
                q: search || undefined,
                location: activeLocation,
                date: date || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
              })}
              className="rounded-card border border-cream/20 px-4 py-2 font-display text-[11px] uppercase tracking-[0.14em] text-cream transition-colors hover:border-gold hover:text-gold"
            >
              Export CSV
            </a>
          ) : undefined
        }
      >
        {/* ── Filtres (combinables) ──────────────────────────────────── */}
        <div className="mb-4 space-y-3 border-b border-cream/10 pb-4">
          <div className="flex flex-wrap items-end gap-3">
            {isSuper && (
              <label className="block">
                <span className="mb-1.5 block font-display text-[10px] uppercase tracking-[0.14em] text-smoke">
                  Restaurant
                </span>
                <Select
                  value={locFilter}
                  onChange={(e) => setLocFilter(e.target.value)}
                  aria-label="Filtrer par restaurant"
                  className="w-52"
                >
                  <option value="">Tous les restaurants</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                  {restaurants.length === 0 &&
                    locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                </Select>
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block font-display text-[10px] uppercase tracking-[0.14em] text-smoke">
                Date exacte
              </span>
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date exacte" className="w-44" />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-display text-[10px] uppercase tracking-[0.14em] text-smoke">
                Du
              </span>
              <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Période du" className="w-44" />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-display text-[10px] uppercase tracking-[0.14em] text-smoke">
                Au
              </span>
              <TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Période au" className="w-44" />
            </label>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-card border border-cream/20 px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.14em] text-smoke transition-colors hover:border-gold hover:text-gold"
            >
              Réinitialiser les filtres
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStatus(status === s.id ? "" : s.id)}
                aria-pressed={status === s.id}
                className={cn(
                  "rounded-card border px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.14em] transition-colors",
                  status === s.id
                    ? "border-gold text-gold"
                    : "border-cream/15 text-smoke hover:border-cream/30"
                )}
              >
                {s.label}
                {byStatus[s.id] ? ` (${byStatus[s.id]})` : ""}
              </button>
            ))}
            <TextInput
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, email, message…"
              className="ml-auto max-w-64"
              aria-label="Rechercher"
            />
          </div>
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        {loading ? (
          <p className="py-6 text-sm text-smoke">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-display text-lg text-smoke">Aucune réservation ne correspond.</p>
            <p className="mt-1 text-sm text-ash">
              Modifiez un filtre, ou <button type="button" onClick={resetFilters} className="text-gold underline underline-offset-2">réinitialisez les filtres</button>.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-cream/15 text-[10px] uppercase tracking-[0.18em] text-smoke">
                    <th className="px-3 py-2 font-medium">Client</th>
                    <th className="px-3 py-2 font-medium">Téléphone</th>
                    <th className="px-3 py-2 font-medium">Restaurant</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Heure</th>
                    <th className="px-3 py-2 text-center font-medium">Pers.</th>
                    <th className="px-3 py-2 font-medium">Statut</th>
                    <th className="px-3 py-2 font-medium">Reçue le</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelected(row)}
                      className="cursor-pointer border-b border-cream/5 transition-colors hover:bg-cream/5"
                      aria-label={`Détails de la réservation de ${row.name}`}
                    >
                      <td className="px-3 py-2.5 text-cream">{row.name}</td>
                      <td className="px-3 py-2.5 text-smoke">
                        {row.phone ? (
                          <a href={`tel:${row.phone.replace(/\s/g, "")}`} onClick={(e) => e.stopPropagation()} className="hover:text-gold">
                            {row.phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-smoke">{restaurantName(row.location_id)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-smoke">{frenchDate(row.date)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-smoke">{frenchTime(row.time)}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-smoke">{row.guests}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em]",
                            row.status === "confirmee" && "border-caution/40 bg-caution/10 text-caution",
                            row.status === "annulee" && "border-signal-bright/40 bg-signal-bright/10 text-signal-bright",
                            row.status === "nouvelle" && "border-gold/40 bg-gold/10 text-gold",
                            row.status === "traitee" && "border-cream/20 text-smoke"
                          )}
                        >
                          {STATUS_LABEL[row.status] ?? row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-ash">{stamp(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-cream/10 pt-4 text-sm text-smoke">
              <p className="tabular-nums">
                Affichage {total === 0 ? 0 : start}–{end} sur {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="rounded-card border border-cream/15 px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition-colors hover:border-gold hover:text-gold disabled:opacity-30"
                >
                  Précédent
                </button>
                {pageWindow(safePage, pageCount).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    aria-current={n === safePage ? "page" : undefined}
                    className={cn(
                      "rounded-card border px-3 py-1.5 text-xs tabular-nums transition-colors",
                      n === safePage ? "border-gold bg-gold text-coal" : "border-cream/15 hover:border-gold hover:text-gold"
                    )}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={safePage === pageCount}
                  className="rounded-card border border-cream/15 px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition-colors hover:border-gold hover:text-gold disabled:opacity-30"
                >
                  Suivant
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ── Fiche détail au clic ──────────────────────────────────── */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Réservation de ${selected.name}`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-card border border-cream/15 bg-charcoal p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl text-cream">{selected.name}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-smoke">
                  {restaurantName(selected.location_id)} · Table le {frenchDate(selected.date)} à {frenchTime(selected.time)} · {selected.guests} pers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Fermer"
                className="rounded-card border border-cream/15 px-3 py-1.5 text-sm text-smoke transition-colors hover:border-cream/30 hover:text-cream"
              >
                Fermer
              </button>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-smoke">Téléphone</dt>
                <dd className="mt-0.5">
                  {selected.phone ? (
                    <a href={`tel:${selected.phone.replace(/\s/g, "")}`} className="text-cream hover:text-gold">
                      {selected.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-smoke">Email</dt>
                <dd className="mt-0.5">
                  <a href={`mailto:${selected.email}`} className="break-all text-cream hover:text-gold">
                    {selected.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-smoke">Reçue le</dt>
                <dd className="mt-0.5 text-cream">{stamp(selected.created_at)}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-smoke">Statut</dt>
                <dd className="mt-1">
                  <Select
                    value={selected.status}
                    onChange={(e) => void changeStatus(selected.id, e.target.value)}
                    aria-label="Statut"
                    disabled={readOnly}
                    className="w-40"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </dd>
              </div>
            </dl>

            {selected.message && (
              <div className="mt-4 rounded-card border border-cream/10 bg-cream/5 p-4">
                <dt className="text-[10px] uppercase tracking-[0.14em] text-smoke">Message du client</dt>
                <dd className="mt-1.5 whitespace-pre-line text-sm text-cream/90">{selected.message}</dd>
              </div>
            )}

            {selected.phone && (
              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={`https://wa.me/${selected.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-card border border-cream/20 px-4 py-2 font-display text-[11px] uppercase tracking-[0.14em] text-cream transition-colors hover:border-gold hover:text-gold"
                >
                  Contacter sur WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
