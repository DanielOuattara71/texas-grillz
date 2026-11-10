import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError, type AdminRestaurantRecord } from "./api";
import { mediaUrl } from "../utils/photoSlot";
import { ActionButton, Card, Notice, TextInput, TextArea } from "./ui";
import { ImagePicker } from "./ImagePicker";

/** Onglet Restaurants (super_admin) : une seule interface pour tout le restaurant. */

interface FormState {
  id: string;
  name: string;
  description: string;
  email: string;
  address: string;
  phone: string;
  image: string;
  mapsUrl: string;
  active: boolean;
  published: boolean;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
}

const emptyForm = (): FormState => ({
  id: "",
  name: "",
  description: "",
  email: "",
  address: "",
  phone: "",
  image: "",
  mapsUrl: "",
  active: true,
  published: true,
  adminName: "",
  adminEmail: "",
  adminPhone: "",
});

const formFromRestaurant = (loc: AdminRestaurantRecord): FormState => ({
  id: loc.id,
  name: loc.name,
  description: loc.description ?? "",
  email: loc.email ?? "",
  address: loc.address,
  phone: loc.phone,
  image: loc.image ?? "",
  mapsUrl: loc.mapsUrl ?? "",
  active: loc.active !== false,
  published: loc.published !== false,
  adminName: loc.admin?.name ?? "",
  adminEmail: loc.admin?.email ?? "",
  adminPhone: loc.admin?.phone ?? "",
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-cream/10 bg-black/20 p-5">
      <h3 className="mb-4 font-display text-[11px] uppercase tracking-[0.18em] text-gold">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-gold"
      />
      <span>
        <span className="block text-sm text-cream">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-smoke">{hint}</span>}
      </span>
    </label>
  );
}

export function RestaurantsScreen() {
  const [restaurants, setRestaurants] = useState<AdminRestaurantRecord[] | null>(null);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [temp, setTemp] = useState<{ email: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api.adminRestaurants();
      setRestaurants(data.restaurants);
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Chargement impossible.",
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setForm(emptyForm());
    setEditingId(null);
    setTemp(null);
    setMessage(null);
    setMode("form");
  }

  function openEdit(loc: AdminRestaurantRecord) {
    setForm(formFromRestaurant(loc));
    setEditingId(loc.id);
    setTemp(null);
    setMessage(null);
    setMode("form");
  }

  async function resetPassword(restaurant: AdminRestaurantRecord) {
    const admin = restaurant.admin;
    if (!admin) {
      setMessage({ tone: "error", text: "Aucun administrateur rattaché à ce restaurant." });
      return;
    }
    try {
      const result = await api.resetUserPassword(admin.id);
      setMessage({ tone: "success", text: `Mot de passe de ${admin.email} réinitialisé.` });
      setTemp({ email: admin.email, password: result.temporaryPassword });
      await load();
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Réinitialisation impossible.",
      });
    }
  }

  async function create() {
    setBusy(true);
    setMessage(null);
    setTemp(null);
    try {
      const result = await api.createRestaurant({
        id: form.id,
        name: form.name,
        description: form.description,
        email: form.email,
        address: form.address,
        phone: form.phone,
        image: form.image,
        mapsUrl: form.mapsUrl,
        active: form.active,
        published: form.published,
        admin: { name: form.adminName, email: form.adminEmail || undefined, phone: form.adminPhone },
      });
      setMessage({ tone: "success", text: `Restaurant ${result.restaurant.id} créé et administrateur associé.` });
      setTemp({ email: result.restaurant.admin?.email ?? "", password: result.temporaryPassword });
      setMode("list");
      setForm(emptyForm());
      await load();
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Création impossible.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function save(loc: AdminRestaurantRecord) {
    setBusy(true);
    setMessage(null);
    try {
      const restaurantPatch: Record<string, unknown> = {
        name: form.name,
        description: form.description,
        email: form.email,
        address: form.address,
        phone: form.phone,
        image: form.image,
        mapsUrl: form.mapsUrl,
        active: form.active,
        published: form.published,
      };
      await api.updateRestaurant(loc.id, restaurantPatch);
      if (loc.admin) {
        const adminPatch: Record<string, unknown> = {};
        if (loc.admin.name !== form.adminName) adminPatch.name = form.adminName;
        if (loc.admin.email !== form.adminEmail) adminPatch.email = form.adminEmail;
        if (loc.admin.phone !== form.adminPhone) adminPatch.phone = form.adminPhone;
        if (Object.keys(adminPatch).length > 0) {
          await api.updateUser(loc.admin.id, adminPatch);
        }
      } else if (form.adminName && form.adminEmail) {
        try {
          const created = await api.createUser({
            email: form.adminEmail,
            name: form.adminName,
            role: "admin",
            location_id: loc.id,
            phone: form.adminPhone,
          });
          setMessage({ tone: "success", text: `Administrateur créé pour ${loc.id}.` });
          setTemp({ email: form.adminEmail, password: created.temporaryPassword });
        } catch (cause) {
          setMessage({
            tone: "success",
            text: `Restaurant ${loc.id} enregistré, mais l'administrateur n'a pas pu être créé (${cause instanceof ApiError ? cause.message : "erreur"}).`,
          });
          await load();
          return;
        }
      }
      setMode("list");
      setMessage({ tone: "success", text: `Restaurant ${loc.id} enregistré.` });
      await load();
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Enregistrement impossible.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggleFlag(loc: AdminRestaurantRecord, field: "active" | "published") {
    setMessage(null);
    try {
      await api.updateRestaurant(loc.id, { [field]: loc[field] === false });
      await load();
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Modification impossible.",
      });
    }
  }

  async function remove(loc: AdminRestaurantRecord) {
    if (!window.confirm(`Supprimer le restaurant « ${loc.name} » ? Refusé si un compte y est rattaché.`)) return;
    try {
      await api.deleteRestaurant(loc.id);
      setMessage({ tone: "success", text: `Restaurant ${loc.id} supprimé.` });
      await load();
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Suppression impossible.",
      });
    }
  }

  const editing = editingId
    ? (restaurants ?? []).find((r) => r.id === editingId) ?? null
    : null;
  const adminAttached = editing ? editing.admin : null;
  const canCreate = Boolean(form.id.trim() && form.name.trim() && form.address.trim() && form.phone.trim() && form.adminName.trim());
  const canSave = Boolean(form.name.trim() && form.address.trim() && form.phone.trim());

  if (mode === "form") {
    return (
      <div className="space-y-6">
        <Card
          title={editingId ? `Modifier le restaurant — ${form.name}` : "Nouveau restaurant"}
          description={
            editingId
              ? "Toutes les informations du restaurant et de son administrateur sont réunies ici."
              : "Renseignez toutes les informations. Le compte de l'administrateur associé est créé en même temps."
          }
        >
          {message && <Notice tone={message.tone}>{message.text}</Notice>}
          {temp && (
            <Notice tone="success">
              Compte administrateur créé. E-mail : <strong className="font-mono">{temp.email}</strong> · Mot de passe temporaire (une seule fois) :{" "}
              <strong className="font-mono">{temp.password}</strong>
              <span className="mt-1 block text-xs text-smoke">À la première connexion, le mot de passe sera demandé à changer.</span>
            </Notice>
          )}

          <div className="space-y-5">
            <Section title="A — Informations du restaurant">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <ImagePicker label="Photo principale" value={form.image} onChange={(url) => setForm({ ...form, image: url })} hint="Visible sur la page du restaurant." />
                </div>
                {!editingId && (
                  <TextInput value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="Identifiant (ex. zone-4)" aria-label="Identifiant" />
                )}
                <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom du restaurant" aria-label="Nom" />
                <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Téléphone" aria-label="Téléphone" inputMode="tel" />
                <TextInput value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Adresse e-mail du restaurant" aria-label="Adresse e-mail du restaurant" type="email" />
                <TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Description du restaurant" aria-label="Description" className="sm:col-span-2" />
              </div>
            </Section>

            <Section title="B — Localisation et coordonnées">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Adresse physique complète" aria-label="Adresse" className="sm:col-span-2" />
                <TextInput value={form.mapsUrl} onChange={(e) => setForm({ ...form, mapsUrl: e.target.value })} placeholder="Lien Google Maps (https://maps.google.com/…)" aria-label="Lien Google Maps" className="sm:col-span-2" inputMode="url" />
                <p className="sm:col-span-2 text-xs text-smoke">
                  Le bouton « Itinéraire » du site ouvrira ce lien directement.
                </p>
              </div>
            </Section>

            <Section title="C — Paramètres et visibilité">
              <div className="grid gap-4 sm:grid-cols-2">
                <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Actif (opérationnel)" hint="Gère les réservations, le compte admin et les données du restaurant." />
                <Toggle checked={form.published} onChange={(v) => setForm({ ...form, published: v })} label="Visible sur le site" hint="Détermine l'affichage public et le formulaire de réservation." />
              </div>
            </Section>

            <Section title="D — Administrateur associé">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} placeholder="Nom et prénom" aria-label="Nom et prénom de l'administrateur" />
                {!editingId ? (
                  <>
                    <TextInput value={form.adminPhone} onChange={(e) => setForm({ ...form, adminPhone: e.target.value })} placeholder="Téléphone (facultatif)" aria-label="Téléphone administrateur" inputMode="tel" />
                    <div className="sm:col-span-2 rounded-card border border-gold/25 bg-gold/5 p-4 text-sm text-cream/85">
                      <p className="font-display text-[11px] uppercase tracking-[0.14em] text-gold">Compte généré automatiquement</p>
                      <p className="mt-1.5">
                        Un e-mail de connexion sera créé pour cet administrateur, ainsi qu'un mot de passe temporaire.
                        Aucun des deux n'est à saisir ici.
                      </p>
                      <p className="mt-1.5 text-xs text-smoke">
                        Format de l'e-mail : <code className="font-mono text-cream">gerant+&lt;identifiant-du-restaurant&gt;@texas-grillz.fr</code>.
                        Les deux valeurs seront affichées une seule fois après l'enregistrement. À sa première connexion, le mot de passe sera demandé à changer.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <TextInput value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="E-mail de connexion" aria-label="E-mail administrateur" type="email" />
                    <TextInput value={form.adminPhone} onChange={(e) => setForm({ ...form, adminPhone: e.target.value })} placeholder="Téléphone (facultatif)" aria-label="Téléphone administrateur" inputMode="tel" />
                    {adminAttached ? (
                      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                        <span className="text-xs text-smoke">
                          {adminAttached.must_change_password ? "Mot de passe temporaire à changer." : "Mot de passe défini."}
                        </span>
                        <ActionButton onClick={() => editing && void resetPassword(editing)}>
                          Réinitialiser le mot de passe
                        </ActionButton>
                      </div>
                    ) : (
                      <span className="text-xs text-smoke">Aucun administrateur rattaché — utilisez les champs ci-dessus puis « Enregistrer ».</span>
                    )}
                  </>
                )}
              </div>
            </Section>

            <div className="flex flex-wrap gap-2">
              <ActionButton
                tone="primary"
                onClick={() => void (editingId ? save(editing!) : create())}
                disabled={busy || (editingId ? !canSave : !canCreate)}
              >
                {busy ? "Enregistrement…" : "Enregistrer le restaurant"}
              </ActionButton>
              <ActionButton onClick={() => setMode("list")}>Annuler</ActionButton>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card
        title="Restaurants"
        description="Adresses Texas GrillZ et leurs administrateurs. Tout se gère ici."
        action={<ActionButton tone="primary" onClick={openCreate}>Ajouter un restaurant</ActionButton>}
      >
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        {temp && (
          <Notice tone="success">
            E-mail : <strong className="font-mono">{temp.email}</strong> · Mot de passe temporaire du nouvel administrateur (une seule fois) :{" "}
            <strong className="font-mono">{temp.password}</strong>
            <span className="mt-1 block text-xs text-smoke">À la première connexion, le mot de passe sera demandé à changer.</span>
          </Notice>
        )}
        <ul className="space-y-3">
          {(restaurants ?? []).map((loc) => {
            const admin = loc.admin;
            const mapsHref = loc.mapsUrl || `https://www.google.com/maps/search/${encodeURIComponent(`${loc.name} ${loc.address}`)}`;
            return (
              <li key={loc.id} className="rounded-card border border-cream/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-start gap-4">
                  {loc.image ? (
                    <img src={mediaUrl(loc.image)} alt={loc.name} className="h-16 w-24 shrink-0 rounded-card object-cover" loading="lazy" />
                  ) : (
                    <div aria-hidden="true" className="flex h-16 w-24 shrink-0 items-center justify-center rounded-card border border-cream/10 bg-coal font-display text-xl text-gold/60">
                      {loc.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-cream">{loc.name} <span className="text-xs text-smoke">({loc.id})</span></p>
                    <p className="mt-0.5 text-sm text-smoke">{loc.address}</p>
                    <p className="mt-0.5 text-xs text-ash">
                      {loc.phone}
                      {loc.email ? ` · ${loc.email}` : ""}
                    </p>
                    <p className="mt-1.5 text-xs text-smoke">
                      {admin ? (
                        <>Administrateur : <span className="text-cream">{admin.name}</span> ({admin.email}){admin.must_change_password ? " · mot de passe à changer" : ""}</>
                      ) : (
                        "Aucun administrateur rattaché"
                      )}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.12em]">
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input type="checkbox" className="h-3.5 w-3.5 accent-gold" checked={loc.active !== false} onChange={() => void toggleFlag(loc, "active")} />
                        <span className="text-smoke">Actif</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input type="checkbox" className="h-3.5 w-3.5 accent-gold" checked={loc.published !== false} onChange={() => void toggleFlag(loc, "published")} />
                        <span className="text-smoke">Visible sur le site</span>
                      </label>
                      <a href={mapsHref} target="_blank" rel="noreferrer" className="text-gold underline underline-offset-2 hover:text-gold-pale">
                        Voir l'itinéraire
                      </a>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <ActionButton onClick={() => openEdit(loc)}>Modifier</ActionButton>
                    <div className="flex flex-wrap gap-2">
                      {admin && <ActionButton onClick={() => void resetPassword(loc)} className="px-2 py-1 text-[10px]">Réinit. mdp</ActionButton>}
                      <ActionButton tone="danger" onClick={() => void remove(loc)} className="px-2 py-1 text-[10px]">Supprimer</ActionButton>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
          {restaurants && restaurants.length === 0 && <p className="text-sm text-smoke">Aucun restaurant. Cliquez sur « Ajouter un restaurant ».</p>}
        </ul>
      </Card>
    </div>
  );
}
