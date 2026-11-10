import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { ActionButton, Card, Notice } from "./ui";
import { useContent } from "../content/store";
import { dayNames, standardSchedule, type DayService } from "../data/hours";

/** Onglet Horaires : éditeur dédié 7 jours, enregistré sous `<id>:hours`. */
const DAYS = [1, 2, 3, 4, 5, 6, 0]; // index DayService : lundi d'abord

export function HoursScreen({ locationId = null }: { locationId?: string | null }) {
  const { locations } = useContent();
  const [rows, setRows] = useState<DayService[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [copyFrom, setCopyFrom] = useState("");

  const key = locationId ? `${locationId}:hours` : "hours";

  async function load() {
    try {
      const data = await api.content();
      const payload = data[key]?.payload;
      setRows(Array.isArray(payload) ? (payload as DayService[]) : standardSchedule);
    } catch {
      setRows(standardSchedule);
      setMessage({ tone: "error", text: "Backend injoignable : horaires livrés affichés." });
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function setDay(index: number, field: "open" | "close", value: string) {
    setRows((current) =>
      (current ?? standardSchedule).map((day, i) =>
        i === index ? { ...day, [field]: value || null } : day
      )
    );
  }

  async function save() {
    if (!rows) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.saveContent(key, rows);
      setMessage({ tone: "success", text: "Horaires enregistrés." });
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Enregistrement impossible.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function copyFromOther() {
    if (!copyFrom) return;
    try {
      const data = await api.content();
      const payload = data[`${copyFrom}:hours`]?.payload;
      if (Array.isArray(payload) && payload.length === 7) {
        setRows(payload as DayService[]);
        setMessage({ tone: "success", text: `Horaires copiés depuis ${copyFrom} (pensez à enregistrer).` });
      } else {
        setMessage({ tone: "error", text: "Aucuns horaires pour ce restaurant." });
      }
    } catch {
      setMessage({ tone: "error", text: "Copie impossible." });
    }
  }

  if (!rows) return <p className="py-6 text-sm text-smoke">Chargement…</p>;

  return (
    <div className="space-y-6">
      <Card
        title="Horaires"
        description={locationId ? `Restaurant ${locationId}, lundi à dimanche.` : "Horaires communs (tous les restaurants)."}
        action={
          <ActionButton tone="primary" onClick={() => void save()} disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </ActionButton>
        }
      >
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <select
            value={copyFrom}
            onChange={(e) => setCopyFrom(e.target.value)}
            aria-label="Copier depuis un autre restaurant"
            className="rounded-card border border-cream/15 bg-coal px-3 py-2 text-sm text-cream"
          >
            <option value="">Copier depuis un autre restaurant…</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <ActionButton onClick={() => void copyFromOther()}>Copier</ActionButton>
          <ActionButton
            onClick={() =>
              setRows((current) => {
                const ref = current?.[1] ?? standardSchedule[1];
                return (current ?? standardSchedule).map(() => ({ ...ref }));
              })
            }
          >
            Copier un jour sur les 7 jours
          </ActionButton>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-smoke">
              <th className="py-2">Jour</th>
              <th className="py-2">Ouvert</th>
              <th className="py-2">Ouverture</th>
              <th className="py-2">Fermeture</th>
            </tr>
          </thead>
          <tbody>
            {DAYS.map((index) => {
              const day = rows[index];
              return (
                <tr key={dayNames[index]} className="border-t border-cream/10">
                  <td className="py-2 text-cream">{dayNames[index]}</td>
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={Boolean(day.open)}
                      onChange={(e) =>
                        setRows((current) =>
                          (current ?? standardSchedule).map((d, i) =>
                            i === index
                              ? e.target.checked
                                ? { open: "12:00", close: "23:30" }
                                : { open: null, close: null }
                              : d
                          )
                        )
                      }
                      aria-label={`Ouvert le ${dayNames[index]}`}
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="time"
                      value={day.open ?? ""}
                      onChange={(e) => setDay(index, "open", e.target.value)}
                      disabled={!day.open}
                      className="rounded-card border border-cream/15 bg-coal px-2 py-1 text-cream"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="time"
                      value={day.close && day.close !== "24:00" ? day.close : day.close === "24:00" ? "23:59" : ""}
                      onChange={(e) => setDay(index, "close", e.target.value === "23:59" ? "24:00" : e.target.value)}
                      disabled={!day.close}
                      className="rounded-card border border-cream/15 bg-coal px-2 py-1 text-cream"
                    />
                    <span className="ml-2 text-xs text-smoke">24:00 = minuit</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
