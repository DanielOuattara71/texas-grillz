/**
 * Suivi des demandes de reservation.
 *
 * C'est l'ecran le plus consulte au quotidien : on y passe le matin pour
 * confirmer les tables de la soiree. L'export CSV permet de sortir la journee
 * vers un carnet ou un tableur sans recopier.
 */
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type Reservation } from "./api";
import { Card, Notice, Select, TextInput } from "./ui";
import { cn } from "../utils/cn";

/** Libelles des statuts, dans l'ordre de traitement. */
const STATUSES = [
  { id: "nouvelle", label: "Nouvelle" },
  { id: "confirmee", label: "Confirmee" },
  { id: "traitee", label: "Traitee" },
  { id: "annulee", label: "Annulee" },
] as const;

/** 2026-12-25 -> 25/12/2026, sans dependre du fuseau du navigateur. */
const frenchDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const stamp = (iso: string) => {
  // SQLite rend "YYYY-MM-DD HH:MM:SS" en UTC : on ajoute le Z explicite.
  const date = new Date(iso.replace(" ", "T") + "Z");
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function ReservationRow({ row, onStatus }: { row: Reservation; onStatus: (id: number, status: string) => void }) {
  return (
    <li className="rounded-card border border-cream/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-cream">
            {row.name}{" "}
            <span className="text-smoke">
              — {row.guests} pers. le {frenchDate(row.date)}
            </span>
          </p>
          <p className="mt-1 text-sm text-smoke">
            <a href={`mailto:${row.email}`} className="transition-colors hover:text-gold">
              {row.email}
            </a>
            {row.phone && (
              <>
                {" · "}
                <a
                  href={`tel:${row.phone.replace(/\s/g, "")}`}
                  className="transition-colors hover:text-gold"
                >
                  {row.phone}
                </a>
              </>
            )}
          </p>
          {row.message && (
            <p className="mt-2 max-w-prose text-sm text-smoke italic">{row.message}</p>
          )}
          <p className="mt-2 text-xs text-ash">Recue le {stamp(row.created_at)}</p>
        </div>

        <Select
          value={row.status}
          onChange={(e) => onStatus(row.id, e.target.value)}
          aria-label={`Statut de la reservation de ${row.name}`}
          className="w-36 shrink-0"
        >
          {STATUSES.map((status) => (
            <option key={status.id} value={status.id}>
              {status.label}
            </option>
          ))}
        </Select>
      </div>
    </li>
  );
}


export function ReservationsScreen() {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.reservations({
        status: filter || undefined,
        q: search || undefined,
        limit: 100,
      });
      setRows(data.rows);
      setByStatus(data.byStatus);
      setTotal(data.total);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(id: number, status: string) {
    // Mise a jour optimiste : l'ecran reagit immediatement, la requete
    // confirme derriere. En cas d'echec, on recharge l'etat vrai.
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, status } : row))
    );
    try {
      await api.setReservationStatus(id, status);
      void load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Modification impossible.");
      void load();
    }
  }

  return (
    <div className="space-y-6">
      <Card
        title="Reservations"
        description={`${total} demande(s) correspondante(s)`}
        action={
          <a
            href={api.reservationsCsvUrl({
              status: filter || undefined,
              q: search || undefined,
            })}
            className="rounded-card border border-cream/20 px-4 py-2 font-display text-[11px] uppercase tracking-[0.14em] text-cream transition-colors hover:border-gold hover:text-gold"
          >
            Export CSV
          </a>
        }
      >
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {STATUSES.map((status) => (
            <button
              key={status.id}
              onClick={() => setFilter(filter === status.id ? "" : status.id)}
              aria-pressed={filter === status.id}
              className={cn(
                "rounded-card border px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.14em] transition-colors",
                filter === status.id
                  ? "border-gold text-gold"
                  : "border-cream/15 text-smoke hover:border-cream/30"
              )}
            >
              {status.label}
              {byStatus[status.id] ? ` (${byStatus[status.id]})` : ""}
            </button>
          ))}

          <TextInput
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un nom, un email…"
            className="ml-auto max-w-xs"
            aria-label="Rechercher une reservation"
          />
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        {loading ? (
          <p className="py-6 text-sm text-smoke">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-sm text-smoke">Aucune reservation pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <ReservationRow key={row.id} row={row} onStatus={changeStatus} />
            ))}
          </ul>
        )}
      </Card>

      {total > rows.length && (
        <Notice>
          {rows.length} demandes affichees sur {total}. Affinez le filtre ou la
          recherche pour voir les suivantes.
        </Notice>
      )}
    </div>
  );
}
