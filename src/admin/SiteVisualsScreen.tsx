/**
 * Visuels du site, hors plats et adresses.
 *
 * Regroupe les emplacements uniques (logo, hero, smoker, page Histoire) et la
 * galerie. Ces visuels vivaient en dur dans les composants : ils n'etaient
 * donc modifiables qu'en editant le code. Ici, chaque emplacement porte son
 * selecteur, et la modification est enregistree dans l'API comme le reste du
 * contenu.
 *
 * La regle de securite visuele du site s'applique : un emplacement sans photo
 * affiche un fond dessine, jamais un cadre casse.
 */
import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { ActionButton, Card, Notice, TextInput, TextArea } from "./ui";
import { ImagePicker, isUsableImage } from "./ImagePicker";
import { useContent } from "../content/store";
import { fixedVisuals } from "../data/visuals";
import type { Visual } from "../data/visuals";

const VIDEOS_DELIVERED = [
  "/videos/Download (6).mp4",
  "/videos/Download (7).mp4",
  "/videos/Download (8).mp4",
  "/videos/Download (10).mp4",
  "/videos/Barbecue_grilling_meat_over_coals_20260927120421.mp4",
  "/videos/Animer_image_barbecue_et_fumée_20260927120505.mp4",
];

/** Combinaisons de boutons : un seul bouton à la fois, sans état partagé. */
/**
 * Edition de la galerie : ordre, visuel et texte alternatif de chaque vignette.
 *
 * La grille melange photos et boucles : une vignette video propose la liste des
 * 6 boucles livrees (elles ne sont pas gerables depuis l'admin — 66 Mo, et le
 * depot passerait par Git), une vignette image passe par le selecteur.
 */
function GalleryEditor({
  items,
  onChange,
  onMove,
  onRemove,
  onAdd,
}: {
  items: Visual[];
  onChange: (index: number, patch: Partial<Visual>) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-smoke">
        L&apos;ordre des vignettes est l&apos;ordre d&apos;affichage. Les boucles
        ne se chargent que sur grand écran ; une vignette sans visuel affiche une
        assiette dessinée.
      </p>

      {items.map((item, index) => (
        <div
          key={item.id}
          className="border-t border-cream/10 pt-4 first:border-0 first:pt-0"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="font-display text-sm text-cream">
              Vignette {index + 1}
            </span>
            <div className="flex gap-2">
              <ActionButton
                className="px-2 py-1 text-[10px]"
                onClick={() => onMove(index, -1)}
                disabled={index === 0}
                aria-label={`Monter la vignette ${index + 1}`}
              >
                ↑
              </ActionButton>
              <ActionButton
                className="px-2 py-1 text-[10px]"
                onClick={() => onMove(index, 1)}
                disabled={index === items.length - 1}
                aria-label={`Descendre la vignette ${index + 1}`}
              >
                ↓
              </ActionButton>
              <ActionButton
                tone="danger"
                className="px-2 py-1 text-[10px]"
                onClick={() => onRemove(index)}
              >
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
                onChange={(event) =>
                  onChange(index, { src: event.target.value, type: "video" })
                }
                className="w-full rounded-card border border-cream/15 bg-black/25 px-3 py-2.5 text-cream"
              >
                {VIDEOS_DELIVERED.map((url) => (
                  <option key={url} value={url}>
                    {url.split("/").pop()}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-ash">
                Les 6 boucles pèsent 66 Mo : elles ne sont chargées que sur
                desktop à pointeur.
              </span>
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
            <TextArea
              rows={2}
              value={item.alt}
              onChange={(event) => onChange(index, { alt: event.target.value })}
            />
          </label>
        </div>
      ))}

      <ActionButton className="px-4 py-2 text-[11px]" onClick={onAdd}>
        Ajouter une vignette
      </ActionButton>
    </div>
  );
}

/** Combinaisons de boutons : un seul bouton à la fois, sans état partagé. */
type Choice = "galerie" | "visuels";

export function SiteVisualsScreen() {
  const { visuals, gallery, fromApi } = useContent();
  const [choice, setChoice] = useState<Choice>("visuels");
  const [draftVisuals, setDraftVisuals] = useState<Record<string, Visual> | null>(null);
  const [draftGallery, setDraftGallery] = useState<Visual[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  // Reprend les valeurs du store a chaque rechargement du contenu.
  useEffect(() => {
    setDraftVisuals(null);
    setDraftGallery(null);
    setDirty(false);
  }, [visuals, gallery]);

  const currentVisuals = draftVisuals ?? visuals;
  const currentGallery = draftGallery ?? gallery;

  const missing = Object.values(currentVisuals).filter(
    (visual) => !isUsableImage(visual.src)
  ).length;
  const withoutAlt = [...Object.values(currentVisuals), ...currentGallery].filter(
    (visual) => !visual.alt.trim()
  ).length;

  function updateVisual(id: string, patch: Partial<Visual>) {
    setDraftVisuals({ ...currentVisuals, [id]: { ...currentVisuals[id], ...patch } });
    setDirty(true);
  }

  function updateGalleryItem(index: number, patch: Partial<Visual>) {
    setDraftGallery(
      currentGallery.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
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
        // Seuls les emplacements modifies sont renvoyes : le store les fusionne
        // sur les fiches livrees, un envoi complet ecraserait les libelles.
        await api.saveContent("visuals", Object.values(draftVisuals));
      }
      if (draftGallery) {
        await api.saveContent("gallery", draftGallery);
      }
      setDirty(false);
      setMessage({ tone: "success", text: "Visuels enregistres." });
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

  return (
    <div className="space-y-6">
      <Card
        title="Visuels du site"
        description="Emplacements uniques et galerie, modifiables sans toucher au code."
        action={
          <ActionButton
            tone="primary"
            onClick={save}
            disabled={!dirty || saving}
            className="px-4 py-2 text-[11px]"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </ActionButton>
        }
      >
        <div className="mb-5 flex flex-wrap gap-2">
          {(["visuels", "galerie"] as const).map((entry) => (
            <button
              key={entry}
              onClick={() => setChoice(entry)}
              aria-pressed={choice === entry}
              className={tabClass(choice === entry)}
            >
              {entry === "visuels"
                ? `Emplacements (${Object.keys(currentVisuals).length})`
                : `Galerie (${currentGallery.length})`}
            </button>
          ))}
        </div>

        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        {fromApi && (
          <p className="mt-4 text-xs text-ash">
            Contenu issu du backend. Sans lui, le site affiche ses visuels livrés
            avec le dépôt.
          </p>
        )}

        {choice === "visuels" ? (
          <div className="space-y-6">
            {missing > 0 && (
              <Notice tone="error">
                {missing} emplacement(s) sans photo : le site dessine un fond à
                la place. Le hero et le smoker jouent alors leur boucle vidéo.
              </Notice>
            )}
            {withoutAlt > 0 && (
              <Notice tone="error">
                {withoutAlt} visuel(s) sans texte alternatif : invisible pour
                les lecteurs d&apos;écran, mauvais pour le référencement.
              </Notice>
            )}

            {fixedVisuals.map((definition) => {
              const visual = currentVisuals[definition.id];
              if (!visual) return null;
              return (
                <div
                  key={visual.id}
                  className="border-t border-cream/10 pt-5 first:border-0 first:pt-0"
                >
                  <ImagePicker
                    label={visual.label}
                    value={visual.src}
                    onChange={(src) => updateVisual(visual.id, { src })}
                    hint={
                      visual.id === "hero" || visual.id === "concept"
                        ? "Vide : la boucle vidéo de repli est jouée."
                        : undefined
                    }
                  />
                  <label className="mt-3 block">
                    <span className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
                      Texte alternatif (accessibilité)
                    </span>
                    <TextInput
                      value={visual.alt}
                      onChange={(event) =>
                        updateVisual(visual.id, { alt: event.target.value })
                      }
                      placeholder="Ce que voit le visiteur, en une phrase"
                    />
                  </label>
                </div>
              );
            })}
          </div>
        ) : (
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
                  id: `g${Date.now().toString(36)}`,
                  label: `Galerie ${currentGallery.length + 1}`,
                  type: "image",
                  src: "",
                  alt: "",
                },
              ]);
              setDirty(true);
            }}
          />
        )}
      </Card>
    </div>
  );
}

