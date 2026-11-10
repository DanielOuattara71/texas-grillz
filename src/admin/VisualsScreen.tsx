/**
 * Gestion des visuels du site public.
 *
 * Un seul module pour tout ce qui vit dans le contenu : les emplacements
 * uniques (hero, logo, concept, page Histoire), la galerie publique, et la
 * bibliothèque de médias. Les photos des plats en sont volontairement exclues
 * (elles restent gérées par chaque administrateur de restaurant).
 *
 * Trois onglets :
 *   - Emplacements : grille des visuels éditables, remplacement en ligne ;
 *   - Galerie : vignettes publiques (ordre, type, texte alternatif) ;
 *   - Bibliothèque : fichiers déposés (recherche, usage, suppression protégée).
 *
 * La page reste réservée au super admin ; l'interface suit la session et le
 * serveur refuse aussi toute écriture aux autres rôles.
 */
import { useContext, useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { ActionButton, Card, Notice, TextInput, TextArea } from "./ui";
import { ImagePicker, isUsableImage } from "./ImagePicker";
import { MediaLibrary } from "./MediaLibrary";
import { useContent } from "../content/store";
import { SessionContext } from "./SessionContext";
import { fixedVisuals } from "../data/visuals";
import type { Visual } from "../data/visuals";
import { mediaUrl } from "../utils/photoSlot";
import { cn } from "../utils/cn";
import { asset } from "../utils/asset";

const VIDEOS_DELIVERED = [
  asset("videos/Download (6).mp4"),
  asset("videos/Download (7).mp4"),
  asset("videos/Download (8).mp4"),
  asset("videos/Download (10).mp4"),
  asset("videos/Animer_image_barbecue_et_fumée_20260927120505.mp4"),
  asset("videos/Animer_image_barbecue_et_fumée_20260927120505.mp4"),
];

/** Sections publiques référencées (id visuel → section + où c'est affiché). */
const EMPLACEMENT_SECTIONS: { id: string; section: string; where: string }[] = [
  { id: "hero", section: "Hero", where: "Accueil — en-tête du site" },
  { id: "logo", section: "Logo", where: "Navigation, pied de page, page de chargement" },
  { id: "concept", section: "Concept", where: "Section « Fumé, jamais pressé »" },
  { id: "histoire", section: "Histoire", where: "Page Histoire — premier chapitre" },
  { id: "histoire-evolution", section: "Histoire", where: "Page Histoire — chapitre « L'évolution »" },
  { id: "fondateur", section: "Histoire", where: "Page Histoire — portrait du fondateur" },
];

const GROUP_ORDER = ["Hero", "Logo", "Concept", "Histoire"];
const matchesQuery = (needle: string, parts: string[]) => {
  const n = needle.trim().toLowerCase();
  return !n || parts.some((part) => (part || "").toLowerCase().includes(n));
};

/** Éditeur de la galerie : ordre, type, visuel, texte alternatif. */
function GalleryEditor({
  items,
  onChange,
  onMove,
  onRemove,
  onAdd,
  query,
}: {
  items: Visual[];
  onChange: (index: number, patch: Partial<Visual>) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  query: string;
}) {
  const visible = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => matchesQuery(query, [item.alt, item.id, item.src, item.label ?? ""]));

  return (
    <div className="space-y-4">
      <p className="text-sm text-smoke">
        L&apos;ordre des vignettes est l&apos;ordre d&apos;affichage. Une vignette vidéo propose les 6
        boucles livrées (elles ne sont pas gérables depuis l&apos;admin) ; une vignette image passe
        par le sélecteur.
      </p>

      {visible.length === 0 && <p className="text-sm text-smoke">Aucune vignette ne correspond.</p>}

      {visible.map(({ item, index }) => (
        <div key={item.id} className="border-t border-cream/10 pt-4 first:border-0 first:pt-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="font-display text-sm text-cream">Vignette {index + 1}</span>
            <div className="flex gap-2">
              <ActionButton className="px-2 py-1 text-[10px]" onClick={() => onMove(index, -1)} disabled={index === 0} aria-label={`Monter la vignette ${index + 1}`}>
                ↑
              </ActionButton>
              <ActionButton className="px-2 py-1 text-[10px]" onClick={() => onMove(index, 1)} disabled={index === items.length - 1} aria-label={`Descendre la vignette ${index + 1}`}>
                ↓
              </ActionButton>
              <ActionButton tone="danger" className="px-2 py-1 text-[10px]" onClick={() => onRemove(index)}>
                Retirer
              </ActionButton>
            </div>
          </div>

          {item.type === "video" ? (
            <label className="block">
              <span className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
                Boucle vidéo
              </span>
              <select
                value={item.src}
                onChange={(event) => onChange(index, { src: event.target.value, type: "video" })}
                className="w-full rounded-card border border-cream/15 bg-black/25 px-3 py-2.5 text-cream"
              >
                {VIDEOS_DELIVERED.map((url) => (
                  <option key={url} value={url}>
                    {url.split("/").pop()}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <ImagePicker
              label="Photo"
              value={item.src}
              onChange={(src) => onChange(index, { src, type: "image" })}
              hint={`Visuel ${index + 1} de la galerie.`}
            />
          )}

          <label className="mt-3 block">
            <span className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
              Texte alternatif
            </span>
            <TextArea rows={2} value={item.alt} onChange={(event) => onChange(index, { alt: event.target.value })} />
          </label>
        </div>
      ))}

      <ActionButton className="px-4 py-2 text-[11px]" onClick={onAdd}>
        Ajouter une vignette
      </ActionButton>
    </div>
  );
}

type Tab = "emplacements" | "galerie" | "bibliotheque";

/** Une carte d'emplacement : aperçu, emplacement, statut, édition en ligne. */
function LocationCard({
  visual,
  where,
  onChange,
}: {
  visual: Visual;
  where: string;
  onChange: (patch: Partial<Visual>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ok = isUsableImage(visual.src);
  const fallback = visual.id === "hero" || visual.id === "concept" ? "vidéo de repli" : "assiette dessinée";

  return (
    <li className="overflow-hidden rounded-card border border-cream/10 bg-black/20">
      <div className="relative aspect-[16/9] bg-coal">
        {ok ? (
          <img src={mediaUrl(visual.src)} alt={visual.alt || visual.label} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-smoke">
            <span className="font-display text-lg">∅</span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-ash">{fallback}</span>
          </div>
        )}
        <span
          className={cn(
            "absolute right-2 top-2 rounded-full border px-2 py-0.5 font-display text-[9px] uppercase tracking-[0.16em]",
            ok ? "border-caution/45 bg-caution/15 text-caution" : "border-signal-bright/45 bg-signal-bright/10 text-signal-bright"
          )}
        >
          {ok ? "Publiée" : "Repli"}
        </span>
      </div>
      <div className="p-4">
        <p className="font-display text-sm text-cream">{visual.label}</p>
        <p className="mt-0.5 text-[11px] text-smoke">{where}</p>
        {open ? (
          <div className="mt-3 space-y-2">
            <ImagePicker label="Remplacer par" value={visual.src} onChange={(src) => onChange({ src })} hint="Écrasé à Enregistrer." />
            <TextInput
              value={visual.alt}
              onChange={(e) => onChange({ alt: e.target.value })}
              placeholder="Texte alternatif (accessibilité)"
              aria-label="Texte alternatif"
            />
            <ActionButton onClick={() => setOpen(false)} className="w-full justify-center px-3 py-2 text-[11px]">
              Fermer
            </ActionButton>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton onClick={() => setOpen(true)} className="px-3 py-1.5 text-[10px] uppercase tracking-[0.12em]">
              Remplacer
            </ActionButton>
            <ActionButton onClick={() => setOpen(true)} className="px-3 py-1.5 text-[10px] uppercase tracking-[0.12em]">
              Texte alt
            </ActionButton>
          </div>
        )}
      </div>
    </li>
  );
}

export function VisualsScreen({ locationId = null }: { locationId?: string | null }) {
  // Garde d'interface (le serveur refuse aussi) : module réservé au super admin.
  const session = useContext(SessionContext);
  const canEdit = session?.user == null || session.user.role === "super_admin";
  const { visuals, gallery } = useContent();
  const [tab, setTab] = useState<Tab>("emplacements");
  const [query, setQuery] = useState("");
  const [draftVisuals, setDraftVisuals] = useState<Record<string, Visual> | null>(null);
  const [draftGallery, setDraftGallery] = useState<Visual[] | null>(null);
  const [seatVisuals, setSeatVisuals] = useState<Record<string, Visual> | null>(null);
  const [seatGallery, setSeatGallery] = useState<Visual[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const visualsKey = locationId ? `${locationId}:visuals` : "visuals";
  const galleryKey = locationId ? `${locationId}:gallery` : "gallery";

  useEffect(() => {
    setDraftVisuals(null);
    setDraftGallery(null);
    setDirty(false);
  }, [visuals, gallery]);

  useEffect(() => {
    if (!locationId) {
      setSeatVisuals(null);
      setSeatGallery(null);
      return;
    }
    setDraftVisuals(null);
    setDraftGallery(null);
    setDirty(false);
    let alive = true;
    (async () => {
      try {
        const data = await api.content();
        const visualsPayload = data[`${locationId}:visuals`]?.payload;
        const galleryPayload = data[`${locationId}:gallery`]?.payload;
        if (!alive) return;
        setSeatVisuals(
          visualsPayload && typeof visualsPayload === "object" && !Array.isArray(visualsPayload)
            ? (visualsPayload as Record<string, Visual>)
            : null
        );
        setSeatGallery(
          Array.isArray(galleryPayload)
            ? (galleryPayload.filter((entry) => typeof entry === "object" && entry !== null) as Visual[])
            : null
        );
      } catch {
        // Sans API : le contenu global du store reste la source.
      }
    })();
    return () => {
      alive = false;
    };
  }, [locationId]);

  const currentVisuals = draftVisuals ?? seatVisuals ?? visuals;
  const currentGallery = draftGallery ?? seatGallery ?? gallery;

  const missing = Object.values(currentVisuals).filter((visual) => !isUsableImage(visual.src)).length;
  const withoutAlt = [...Object.values(currentVisuals), ...currentGallery].filter(
    (visual) => !visual.alt.trim()
  ).length;

  function updateVisual(id: string, patch: Partial<Visual>) {
    setDraftVisuals({ ...currentVisuals, [id]: { ...currentVisuals[id], ...patch } });
    setDirty(true);
  }

  function updateGalleryItem(index: number, patch: Partial<Visual>) {
    setDraftGallery(currentGallery.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    setDirty(true);
  }

  function moveInGallery(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= currentGallery.length) return;
    const next = [...currentGallery];
    [next[index], next[target]] = [next[target], next[index]];
    setDraftGallery(next);
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      if (draftVisuals) {
        await api.saveContent(visualsKey, Object.values(draftVisuals));
      }
      if (draftGallery) {
        await api.saveContent(galleryKey, draftGallery);
      }
      setDirty(false);
      setMessage({ tone: "success", text: "Visuels enregistrés." });
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Enregistrement impossible.",
      });
    } finally {
      setSaving(false);
    }
  }

  const tabClass = (active: boolean) =>
    active
      ? "rounded-card border border-gold px-4 py-2 font-display text-[11px] uppercase tracking-[0.14em] text-gold"
      : "rounded-card border border-cream/15 px-4 py-2 font-display text-[11px] uppercase tracking-[0.14em] text-smoke hover:border-cream/30";

  if (!canEdit) {
    return (
      <Card title="Gestion des visuels" description="Images du site public.">
        <Notice tone="info">
          Les visuels du site public sont réservés au super admin. Les photos des plats
          restent gérées par chaque administrateur de restaurant.
        </Notice>
      </Card>
    );
  }

  const filteredGroups = GROUP_ORDER.map((group) => {
    const entries = fixedVisuals.filter((definition) => {
      const def = EMPLACEMENT_SECTIONS.find((entry) => entry.id === definition.id);
      const section = def?.section ?? "";
      return (
        section === group &&
        matchesQuery(query, [definition.label, definition.id, def?.where ?? "", currentVisuals[definition.id]?.src ?? ""])
      );
    });
    return { group, entries };
  }).filter(({ entries }) => entries.length > 0);

  return (
    <div className="space-y-6">
      <Card
        title="Gestion des visuels"
        description="Toutes les images du site public, au même endroit. Les photos des plats ne sont pas ici."
        action={
          <ActionButton
            tone="primary"
            onClick={save}
            disabled={!dirty || saving || tab === "bibliotheque"}
            className="px-4 py-2 text-[11px]"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </ActionButton>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              { id: "emplacements", label: "Emplacements" },
              { id: "galerie", label: "Galerie" },
              { id: "bibliotheque", label: "Bibliothèque" },
            ] as const
          ).map((entry) => (
            <button
              key={entry.id}
              onClick={() => setTab(entry.id)}
              aria-pressed={tab === entry.id}
              className={tabClass(tab === entry.id)}
            >
              {entry.label}
            </button>
          ))}
          {tab !== "bibliotheque" && (
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un visuel, un emplacement…"
              aria-label="Rechercher dans les visuels"
              className="w-64"
            />
          )}
        </div>

        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        {tab === "emplacements" && (
          <div className="space-y-6">
            {missing > 0 && (
              <Notice tone="error">
                {missing} emplacement(s) sans photo : le site dessine un fond à la place. Le hero et le smoker jouent alors leur boucle vidéo.
              </Notice>
            )}
            {withoutAlt > 0 && (
              <Notice tone="error">
                {withoutAlt} visuel(s) sans texte alternatif : invisible pour les lecteurs d&apos;écran.
              </Notice>
            )}

            {filteredGroups.length === 0 && <p className="text-sm text-smoke">Aucun emplacement ne correspond.</p>}
            {filteredGroups.map(({ group, entries }) => (
              <section key={group}>
                <h3 className="mb-3 font-display text-[11px] uppercase tracking-[0.18em] text-gold">{group}</h3>
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {entries.map((definition) => {
                    const visual = currentVisuals[definition.id];
                    const def = EMPLACEMENT_SECTIONS.find((entry) => entry.id === definition.id);
                    if (!visual) return null;
                    return (
                      <LocationCard
                        key={definition.id}
                        visual={visual}
                        where={def?.where ?? definition.label}
                        onChange={(patch) => updateVisual(definition.id, patch)}
                      />
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        {tab === "galerie" && (
          <GalleryEditor
            items={currentGallery}
            onChange={(index, patch) => updateGalleryItem(index, patch)}
            onMove={moveInGallery}
            onRemove={(index) => {
              setDraftGallery(currentGallery.filter((_, i) => i !== index));
              setDirty(true);
            }}
            onAdd={() => {
              setDraftGallery([
                ...currentGallery,
                {
                  id: `g${crypto.randomUUID?.() ?? Date.now().toString(36)}`,
                  label: `Galerie ${currentGallery.length + 1}`,
                  type: "image",
                  src: "",
                  alt: "",
                },
              ]);
              setDirty(true);
            }}
            query={query}
          />
        )}

        {tab === "bibliotheque" && <MediaLibrary scope="super" />}
      </Card>
    </div>
  );
}
