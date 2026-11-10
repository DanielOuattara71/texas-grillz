import { useEffect, useState } from "react";
import { api, ApiError, type PlatRecord } from "./api";
import { ActionButton, Card, Notice, Select, TextInput, TextArea } from "./ui";
import { ImagePicker, isUsableImage } from "./ImagePicker";
import { mediaUrl, photoSlot } from "../utils/photoSlot";
import { cn } from "../utils/cn";
import { useContent } from "../content/store";

/**
 * Onglet Plats : l'éditeur unique des plats affichés sur le site.
 * La table `plats` est la source de vérité : le site public affiche ces
 * lignes, pas le bloc livré. Chaque plat est lié à 1 seul restaurant.
 */
const PER_PAGE = 12;

/** Pagination compacte : fenêtre de numéros autour de la page courante. */
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

export function PlatsScreen({ locationId = null }: { locationId?: string | null }) {
  const { locations } = useContent();
  const [plats, setPlats] = useState<PlatRecord[] | null>(null);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [priceFrom, setPriceFrom] = useState(false);
  const [category, setCategory] = useState("");
  const [newImage, setNewImage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [resto, setResto] = useState(locationId ?? "");
  const [page, setPage] = useState(1);

  async function load(targetResto?: string | null) {
    const idToUse = targetResto ?? resto ?? locationId ?? null;
    try {
      if (!idToUse) {
        // Super admin sans siège sélectionné : tous les plats de tous les restaurants.
        const dishes = await api.plats();
        setPlats(dishes.plats);
        setCategories([]);
        setCategory("");
        return;
      }
      const [dishes, cats] = await Promise.all([
        api.plats({ location: idToUse }),
        api.adminCategories({ location: idToUse }),
      ]);
      setPlats(dishes.plats);
      setCategories(cats.categories.filter((c) => c.active !== false));
      setCategory((current) =>
        current && cats.categories.some((c) => c.id === current && c.active !== false) ? current : cats.categories.find((c) => c.active !== false)?.id ?? ""
      );
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof ApiError ? cause.message : "Chargement impossible." });
    }
  }

  useEffect(() => {
    setPage(1);
    setEditingId(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resto, locationId]);

  useEffect(() => {
    if (locationId) {
      setResto(locationId);
      return;
    }
    // Super admin sans siège : présélectionne le premier restaurant pour que
    // les catégories se chargent tout de suite au lieu d'un input bloqué.
    setResto((current) => current || (locations[0]?.id ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, locations]);

  async function create() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.createPlat({
        id,
        name,
        description: description.trim(),
        price: Number(price),
        category,
        priceFrom,
        image: newImage,
        locationId: resto || locationId || undefined,
      });
      setMessage({ tone: "success", text: `Plat ${result.plat.id} ajouté à ${result.plat.locationId ?? resto}.` });
      setId("");
      setName("");
      setDescription("");
      setPrice("");
      setPriceFrom(false);
      setNewImage("");
      await load();
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof ApiError ? cause.message : "Création impossible." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(plat: PlatRecord) {
    if (!window.confirm(`Supprimer le plat « ${plat.name} » ?`)) return;
    try {
      await api.deletePlat(plat.id);
      setMessage({ tone: "success", text: `Plat ${plat.id} supprimé.` });
      await load();
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof ApiError ? cause.message : "Suppression impossible." });
    }
  }

  const all = plats ?? [];
  const pageCount = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * PER_PAGE;
  const visible = all.slice(start, start + PER_PAGE);
  const end = Math.min(all.length, start + PER_PAGE);

  return (
    <div className="space-y-6">
      <Card
        title="Plats"
        description={locationId ? `Plats de ${locationId}, liés à 1 seul restaurant.` : "Tous les plats de tous les restaurants. Choisissez un restaurant dans le formulaire pour filtrer."}
      >
        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <TextInput value={id} onChange={(e) => setId(e.target.value)} placeholder="Identifiant (ex. ribs-o-ribs)" aria-label="Identifiant" />
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" aria-label="Nom" />
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Description (facultative)" aria-label="Description" className="sm:col-span-2" />
          <TextInput value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Prix FCFA" aria-label="Prix" inputMode="numeric" />
          <Select value={priceFrom ? "from" : "net"} onChange={(e) => setPriceFrom(e.target.value === "from")} aria-label="Type de prix">
            <option value="net">Prix net</option>
            <option value="from">Prix « à partir de »</option>
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie" disabled={categories.length === 0}>
            {categories.length === 0 && (
              <option value="">
                {locations.length === 0 ? "Aucune catégorie. Créez-en une dans l'onglet Catégories" : "Choisissez d'abord un restaurant ci-dessous"}
              </option>
            )}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
          <Select value={resto} onChange={(e) => setResto(e.target.value)} aria-label="Restaurant" disabled={Boolean(locationId)}>
            <option value="">Restaurant…</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
          <div className="sm:col-span-2">
            <ImagePicker
              label="Photo du plat (facultative)"
              value={newImage}
              onChange={setNewImage}
              hint="Sinon, le site dessine une assiette à la place."
            />
          </div>
          <ActionButton tone="primary" onClick={() => void create()} disabled={busy || !id || !name || !price || !category || !(resto || locationId)}>
            {busy ? "Création…" : "Ajouter le plat"}
          </ActionButton>
        </div>

        <ul className="space-y-3">
          {visible.map((p) => (
            <li key={p.id} className="rounded-card border border-cream/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Thumb plat={p} />
                  <div>
                    <p className="font-display text-cream">{p.name} <span className="text-smoke normal-case">, {p.priceFrom ? `dès ${p.price}` : p.price} FCFA</span></p>
                    {p.description && <p className="mt-0.5 max-w-prose text-xs text-smoke">{p.description}</p>}
                    <p className="mt-1 text-xs text-smoke">
                      {p.category} · {locations.find((l) => l.id === (p.locationId ?? p.restaurantId))?.name ?? p.locationId ?? p.restaurantId ?? "aucun"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <ActionButton onClick={() => setEditingId(editingId === p.id ? null : p.id)}>
                    {editingId === p.id ? "Fermer" : "Modifier"}
                  </ActionButton>
                  <ActionButton tone="danger" onClick={() => void remove(p)}>Supprimer</ActionButton>
                </div>
              </div>
              {editingId === p.id && (
                <PlatEditPanel
                  key={p.id}
                  plat={p}
                  locations={locations}
                  lockLocation={Boolean(locationId)}
                  onSaved={() => { setEditingId(null); void load(); }}
                  onClose={() => setEditingId(null)}
                />
              )}
            </li>
          ))}
          {plats && plats.length === 0 && <p className="text-sm text-smoke">Aucun plat en base. Ajoutez-en un ci-dessus.</p>}
        </ul>

        {plats && plats.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-cream/10 pt-4 text-sm text-smoke">
            <p className="tabular-nums">
              Affichage {start + 1}–{end} sur {all.length} plat{all.length > 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="rounded-card border border-cream/15 px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition-colors hover:border-gold hover:text-gold disabled:pointer-events-none disabled:opacity-30"
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
                    n === safePage
                      ? "border-gold bg-gold text-coal"
                      : "border-cream/15 hover:border-gold hover:text-gold"
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={safePage === pageCount}
                className="rounded-card border border-cream/15 px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition-colors hover:border-gold hover:text-gold disabled:pointer-events-none disabled:opacity-30"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/** Pastille de plat dans la liste : vignette si une photo existe, sinon l'initiale. */
function Thumb({ plat }: { plat: PlatRecord }) {
  const src = photoSlot(plat.image ?? "");
  if (!src || !isUsableImage(src)) {
    return (
      <div
        aria-hidden="true"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card border border-cream/10 bg-coal font-display text-lg text-gold/60"
      >
        {(plat.name || "?").slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={mediaUrl(src)}
      alt={plat.name}
      className="h-14 w-14 shrink-0 rounded-card border border-cream/10 object-cover"
      loading="lazy"
    />
  );
}

/** Édition en ligne d'un plat existant : tous les champs, enregistrement direct. */
function PlatEditPanel({
  plat,
  locations,
  lockLocation,
  onSaved,
  onClose,
}: {
  plat: PlatRecord;
  locations: { id: string; name: string }[];
  lockLocation: boolean;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(plat.name);
  const [description, setDescription] = useState(plat.description ?? "");
  const [price, setPrice] = useState(String(plat.price));
  const [priceFrom, setPriceFrom] = useState(Boolean(plat.priceFrom));
  const [locationId, setLocationId] = useState(plat.locationId ?? plat.restaurantId ?? "");
  const [category, setCategory] = useState(plat.category);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [image, setImage] = useState(plat.image ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Catégories du restaurant de CE plat (pas forcément celui de la page).
  useEffect(() => {
    let alive = true;
    const idToUse = locationId || null;
    if (!idToUse) return;
    api
      .adminCategories({ location: idToUse })
      .then((data) => {
        if (!alive) return;
        setCategories(data.categories.filter((c) => c.active !== false));
      })
      .catch(() => {
        // Sans API, on garde la catégorie courante (validation côté serveur).
      });
    return () => {
      alive = false;
    };
  }, [locationId]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.updatePlat(plat.id, {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        priceFrom,
        category,
        image,
        ...(lockLocation ? {} : { locationId }),
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-cream/10 pt-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" aria-label="Nom" />
        <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} aria-label="Restaurant" disabled={lockLocation}>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </Select>
        <TextInput value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Prix FCFA" aria-label="Prix" inputMode="numeric" />
        <Select value={priceFrom ? "from" : "net"} onChange={(e) => setPriceFrom(e.target.value === "from")} aria-label="Type de prix">
          <option value="net">Prix net</option>
          <option value="from">Prix « à partir de »</option>
        </Select>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie">
          {categories.length === 0 && <option value={category}>{category}</option>}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </Select>
        <TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Description (facultative)" aria-label="Description" className="sm:col-span-2" />
        <div className="sm:col-span-2">
          <ImagePicker
            label="Photo du plat"
            value={photoSlot(image ?? "")}
            onChange={setImage}
            hint="Appliquée en cliquant sur « Enregistrer »."
          />
        </div>
      </div>
      {error && <p className="text-xs text-signal-bright">{error}</p>}
      <div className="flex gap-2">
        <ActionButton tone="primary" onClick={() => void save()} disabled={saving || !name.trim() || !price}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </ActionButton>
        <ActionButton onClick={onClose}>Fermer</ActionButton>
      </div>
    </div>
  );
}
