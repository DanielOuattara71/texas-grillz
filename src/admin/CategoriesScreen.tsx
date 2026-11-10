import { useEffect, useMemo, useState } from "react";
import { api, ApiError, type CategoryRecord } from "./api";
import { ActionButton, Card, Notice, Select, TextInput, TextArea } from "./ui";
import { useContent } from "../content/store";
import { useSession } from "./SessionContext";
import { cn } from "../utils/cn";

/**
 * Catégories de la carte, par restaurant.
 * Section A : créer une catégorie. Section B : gérer l'existant (ordre,
 * libellé, note, visibilité, suppression), avec le nombre de plats rattachés
 * pour chaque catégorie (utilisé pour l'avertissement de suppression).
 */
export function CategoriesScreen({ locationId = null }: { locationId?: string | null }) {
  const { user } = useSession();
  const { locations } = useContent();
  const isAdmin = user?.role === "admin";
  const ownLocationId = isAdmin ? user?.location_id ?? null : null;
  const editableLocations = useMemo(
    () => (isAdmin ? locations.filter((l) => l.id === ownLocationId) : locations),
    [isAdmin, ownLocationId, locations]
  );
  const preferredId = (locationId && editableLocations.find((l) => l.id === locationId)?.id) ?? editableLocations[0]?.id ?? null;

  const [selected, setSelected] = useState<string | null>(preferredId);
  const [categories, setCategories] = useState<CategoryRecord[] | null>(null);
  const [platCount, setPlatCount] = useState<Record<string, number>>({});
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [sort, setSort] = useState("99");
  const [activeOnCreate, setActiveOnCreate] = useState(true);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { label: string; note: string; sort: string }>>({});

  async function load(rid: string | null) {
    if (!rid) {
      setCategories([]);
      setDrafts({});
      setPlatCount({});
      return;
    }
    try {
      const [data, dishes] = await Promise.all([
        api.adminCategories({ location: rid }),
        api.plats({ location: rid }),
      ]);
      setCategories(data.categories);
      setDrafts(
        Object.fromEntries(data.categories.map((c) => [c.id, { label: c.label, note: c.note, sort: String(c.sort) }]))
      );
      const counts: Record<string, number> = {};
      for (const dish of dishes.plats) counts[dish.category] = (counts[dish.category] ?? 0) + 1;
      setPlatCount(counts);
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof ApiError ? cause.message : "Chargement impossible." });
    }
  }

  useEffect(() => {
    if (preferredId) setSelected(preferredId);
  }, [preferredId]);

  useEffect(() => {
    void load(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  async function create() {
    if (!selected || !id.trim() || !label.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.createCategory({
        id: id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-+|-+$)/g, ""),
        locationId: selected,
        label: label.trim(),
        note: note.trim(),
        sort: Number(sort) || 99,
        active: activeOnCreate,
      });
      setId("");
      setLabel("");
      setNote("");
      setSort("99");
      setActiveOnCreate(true);
      await load(selected);
      setMessage({ tone: "success", text: "Catégorie créée." });
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof ApiError ? cause.message : "Création impossible." });
    } finally {
      setBusy(false);
    }
  }

  /** La ligne est « sale » (différente de la source) ? */
  function isDirty(cat: CategoryRecord): boolean {
    const d = drafts[cat.id];
    if (!d) return false;
    return d.label !== cat.label || d.note !== cat.note || String(d.sort) !== String(cat.sort);
  }

  async function save(cat: CategoryRecord) {
    const draft = drafts[cat.id];
    if (!draft) return;
    const nextSort = Number(draft.sort);
    try {
      await api.updateCategory(cat.locationId ?? selected!, cat.id, {
        label: draft.label,
        note: draft.note,
        sort: Number.isFinite(nextSort) ? nextSort : cat.sort,
      });
      await load(selected);
      setMessage({ tone: "success", text: `Catégorie « ${cat.label} » enregistrée.` });
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof ApiError ? cause.message : "Enregistrement impossible." });
    }
  }

  async function toggleActive(cat: CategoryRecord) {
    try {
      await api.updateCategory(cat.locationId ?? selected!, cat.id, { active: !cat.active });
      await load(selected);
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof ApiError ? cause.message : "Modification impossible." });
    }
  }

  async function remove(cat: CategoryRecord) {
    const count = platCount[cat.id] ?? 0;
    const detail = count > 0 ? ` et ses ${count} plat${count > 1 ? "s" : ""} rattaché${count > 1 ? "s" : ""} supprimé${count > 1 ? "s" : ""}` : "";
    if (!window.confirm(`Supprimer la catégorie « ${cat.label} »${detail} ?`)) return;
    try {
      await api.deleteCategory(cat.locationId ?? selected!, cat.id);
      await load(selected);
      setMessage({ tone: "success", text: `Catégorie « ${cat.label} » supprimée.` });
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof ApiError ? cause.message : "Suppression impossible." });
    }
  }

  const restaurantLabel = editableLocations.find((l) => l.id === selected)?.name ?? selected ?? "";

  return (
    <div className="space-y-6">
      <Card
        title="Catégories"
        description={isAdmin ? "Catégories de votre restaurant, visibles sur le site public." : "Chaque restaurant gère ses catégories séparément."}
      >
        {editableLocations.length === 0 && <Notice tone="info">Aucun restaurant disponible.</Notice>}
        {editableLocations.length > 1 && (
          <Select value={selected ?? ""} onChange={(e) => setSelected(e.target.value || null)} aria-label="Restaurant" className="mb-5 w-72">
            {editableLocations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        )}

        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        {/* ── A. Ajouter une catégorie ─────────────────────────────── */}
        <section className="mb-6 rounded-card border border-cream/10 bg-black/20 p-5">
          <h3 className="font-display text-[11px] uppercase tracking-[0.18em] text-gold">Ajouter une catégorie</h3>
          <p className="mt-1 text-xs text-smoke">Elle sera disponible dans l'onglet Plats et visible sur le site de ce restaurant.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-smoke">Identifiant</span>
              <TextInput value={id} onChange={(e) => setId(e.target.value)} placeholder="ex. bbq" aria-label="Identifiant" />
              <span className="mt-1 block text-[11px] text-ash">Interne, minuscules sans accents (utilisé dans les plats).</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-smoke">Libellé affiché</span>
              <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex. Viande BBQ" aria-label="Libellé" />
              <span className="mt-1 block text-[11px] text-ash">Titre de la section sur le site public.</span>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-smoke">Note (sous le titre)</span>
              <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. Poulet texan, côtes de porc, sauce secrète de la maison." aria-label="Note" rows={2} />
              <span className="mt-1 block text-[11px] text-ash">Texte court facultatif affiché sous le titre.</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-smoke">Ordre d'affichage</span>
              <TextInput value={sort} onChange={(e) => setSort(e.target.value)} placeholder="ex. 3" aria-label="Ordre" inputMode="numeric" />
              <span className="mt-1 block text-[11px] text-ash">1 s'affiche tout en haut de la carte.</span>
            </label>
            <label className="flex items-start gap-3 rounded-card border border-cream/10 p-3">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-gold" checked={activeOnCreate} onChange={(e) => setActiveOnCreate(e.target.checked)} />
              <span>
                <span className="block text-sm text-cream">Visible sur le site</span>
                <span className="mt-0.5 block text-[11px] text-smoke">Masquée = créée mais non affichée.</span>
              </span>
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <ActionButton tone="primary" onClick={() => void create()} disabled={busy || !selected || !id.trim() || !label.trim()}>
              {busy ? "Création…" : "Ajouter la catégorie"}
            </ActionButton>
          </div>
        </section>

        {/* ── B. Catégories en place ───────────────────────────────── */}
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <h3 className="font-display text-[11px] uppercase tracking-[0.18em] text-gold">Catégories en place</h3>
          {restaurantLabel && <p className="text-[11px] text-ash">{restaurantLabel}</p>}
        </div>

        {(categories ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-smoke">Aucune catégorie pour l'instant. Ajoutez-en une ci-dessus.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-cream/15 text-[10px] uppercase tracking-[0.18em] text-smoke">
                  <th className="px-2 py-2 text-left font-medium w-16">Ordre</th>
                  <th className="px-2 py-2 text-left font-medium">Libellé</th>
                  <th className="px-2 py-2 text-left font-medium">Note</th>
                  <th className="px-2 py-2 text-center font-medium w-20">Plats</th>
                  <th className="px-2 py-2 text-left font-medium w-40">Statut</th>
                  <th className="px-2 py-2 text-right font-medium w-36">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(categories ?? []).map((cat) => {
                  const draft = drafts[cat.id] ?? { label: cat.label, note: cat.note, sort: String(cat.sort) };
                  const dirty = isDirty(cat);
                  return (
                    <tr key={cat.id} className="border-b border-cream/5 align-middle">
                      <td className="px-2 py-2">
                        <TextInput
                          value={draft.sort}
                          onChange={(e) => setDrafts((d) => ({ ...d, [cat.id]: { ...d[cat.id], sort: e.target.value } }))}
                          aria-label={`Ordre ${cat.id}`}
                          inputMode="numeric"
                          className="w-14"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <TextInput
                          value={draft.label}
                          onChange={(e) => setDrafts((d) => ({ ...d, [cat.id]: { ...d[cat.id], label: e.target.value } }))}
                          aria-label={`Libellé ${cat.id}`}
                        />
                        <p className="mt-0.5 text-[10px] text-ash">id : {cat.id}</p>
                      </td>
                      <td className="px-2 py-2">
                        <TextInput
                          value={draft.note}
                          onChange={(e) => setDrafts((d) => ({ ...d, [cat.id]: { ...d[cat.id], note: e.target.value } }))}
                          aria-label={`Note ${cat.id}`}
                          placeholder="Note affichée sous le titre…"
                        />
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums text-smoke">{platCount[cat.id] ?? 0}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]",
                              cat.active
                                ? "border-caution/40 bg-caution/10 text-caution"
                                : "border-cream/20 text-smoke"
                            )}
                          >
                            {cat.active ? "Visible" : "Masquée"}
                          </span>
                          <button
                            type="button"
                            onClick={() => void toggleActive(cat)}
                            className="text-xs text-smoke underline underline-offset-2 transition-colors hover:text-gold"
                          >
                            {cat.active ? "Masquer" : "Afficher"}
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {dirty && (
                            <ActionButton onClick={() => void save(cat)} className="px-2 py-1 text-[10px] uppercase">
                              Enregistrer
                            </ActionButton>
                          )}
                          <ActionButton tone="danger" onClick={() => void remove(cat)} className="px-2 py-1 text-[10px] uppercase">
                            Supprimer
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
