import { useEffect, useState } from "react";
import { api, ApiError, type AuditRow } from "./api";
import { Card, Notice, TextInput } from "./ui";

/** Onglet Journal (super_admin, developer) : modifications. */
export function AuditScreen() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [q, setQ] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function load(query: string) {
    try {
      const data = await api.audit({ q: query || undefined, limit: 200 });
      setRows(data.rows);
    } catch (cause) {
      setMessage(cause instanceof ApiError ? cause.message : "Chargement impossible.");
    }
  }

  useEffect(() => {
    void load("");
  }, []);

  return (
    <div className="space-y-6">
      <Card title="Journal" description="Qui a modifié quoi, quand.">
        {message && <Notice tone="error">{message}</Notice>}
        <div className="mb-5">
          <TextInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrer (action, clé, résumé)…"
            aria-label="Filtrer le journal"
            onKeyDown={(e) => {
              if (e.key === "Enter") void load(q);
            }}
          />
        </div>
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-card border border-cream/10 bg-black/20 p-3 text-sm">
              <p className="text-cream">
                {row.action} <span className="text-smoke">· {row.key ?? "sans clé"} · {row.location_id ?? "global"}</span>
              </p>
              <p className="mt-1 text-xs text-smoke">{row.summary ?? ""}</p>
              <p className="mt-1 text-xs text-ash">{row.at} · {row.user_id == null ? "système" : `utilisateur ${row.user_id}`}</p>
            </li>
          ))}
          {rows.length === 0 && <p className="text-sm text-smoke">Aucune entrée.</p>}
        </ul>
      </Card>
    </div>
  );
}
