/**
 * Lecteur / editeur d'un bloc de contenu, avec repli sur les donnees livrees.
 *
 * Pourquoi une edition "liste de champs" plutot qu'un formulaire cible par
 * bloc : la forme exacte du contenu vit dans `src/data/*.ts` (TypeScript), et
 * la dupliquer ici la ferait diverger. Cet ecran est donc genere a partir de
 * la valeur reelle : chaque bloc edite un tableau d'objets, chaque objet est
 * une carte de champs. C'est moins agreable qu'un formulaire artisanal, mais
 * ca ne peut pas mentir sur la structure et ca couvre les 8 blocs d'un coup.
 *
 * Si l'API est indisponible (pas encore de backend, hors ligne), l'ecran
 * affiche le contenu livre dans `src/data` en lecture seule — on ne casse
 * jamais le site public, qui ne depend pas de l'API.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "./api";
import { Card, Notice, TextInput, TextArea, Select, ActionButton } from "./ui";
import { ImagePicker } from "./ImagePicker";
import { cn } from "../utils/cn";
import { menuItems } from "../data/menu";
import { standardSchedule } from "../data/hours";
import { locations } from "../data/locations";
import { testimonials } from "../data/testimonials";

/** Reperes des champs d'un plat, dans l'ordre ou le restaurant les renseigne. */
const MENU_HINTS: Record<string, string> = {
  name: "Titre du plat",
  description: "Description",
  price: "Prix en euros",
  category: "Categorie",
  badge: "Badge",
  image: "URL de l'image",
  orders: "Commandes du mois",
};

export type BlockId =
  | "menu"
  | "hours"
  | "locations"
  | "testimonials"
  | "texts";

/** Champs traites comme du texte long (une zone de saisie, pas une ligne). */
const LONG_FIELDS = new Set(["description", "text", "message", "hook", "subtitle", "kicker"]);

/** Champs traites comme des nombres. */
const NUMBER_FIELDS = new Set(["price", "orders", "value", "rating", "guests", "number", "decimals", "from"]);

/** Champs traites comme des listes de chaines (tableau de valeurs). */
const LIST_FIELDS = new Set([
  "tonight",
  "chips",
  "labels",
  "marquee",
  "cautionTape",
]);

type Row = Record<string, unknown>;

function isRow(value: unknown): value is Row {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Champs a ne pas exposer dans l'editeur : ils ne sont pas des textes, ils
 * recoivent un composant specifique (selecteur d'image, boucle video).
 */
const HIDDEN_FIELDS = new Set(["video"]);

/**
 * Champs image : ils s'editent avec le selecteur de la bibliotheque, pas avec
 * une zone de texte. `image` est le champ de la carte et des adresses, `src`
 * celui de la galerie.
 */
const IMAGE_FIELDS: Record<string, { required?: boolean; hint?: string }> = {
  image: {
    required: true,
    hint: "Sans photo, le plat s'affiche sur une assiette dessinée en CSS.",
  },
  src: { hint: "Photo ou vidéo de la vignette." },
};

function fieldLabel(key: string, block: BlockId) {
  if (block === "menu" && MENU_HINTS[key]) return MENU_HINTS[key];
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function renderField(key: string, value: unknown, onChange: (next: unknown) => void, block: BlockId) {
  const id = `f-${key}`;
  if (LIST_FIELDS.has(key) && Array.isArray(value)) {
    return (
      <div key={key} className="sm:col-span-2">
        <label htmlFor={id} className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
          {fieldLabel(key, block)} (liste, une par ligne)
        </label>
        <TextArea
          id={id}
          rows={3}
          value={value.join("\n")}
          onChange={(e) => onChange(e.target.value.split("\n").filter(Boolean))}
        />
      </div>
    );
  }

  const common = {
    id,
    value: value == null ? "" : String(value),
    onChange: (e: { target: { value: string } }) =>
      onChange(
        NUMBER_FIELDS.has(key)
          ? e.target.value === ""
            ? 0
            : Number(e.target.value)
          : e.target.value
      ),
  };

  return (
    <div key={key}>
      <label htmlFor={id} className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
        {fieldLabel(key, block)}
      </label>
      {LONG_FIELDS.has(key) ? (
        <TextArea {...common} rows={3} />
      ) : typeof value === "boolean" ? (
        <Select
          {...common}
          onChange={(e) => onChange(e.target.value === "true")}
          value={String(value)}
        >
          <option value="true">Oui</option>
          <option value="false">Non</option>
        </Select>
      ) : (
        <TextInput {...common} />
      )}
    </div>
  );
}


/** Contenus livres, utilises en repli quand l'API ne repond pas. */
const FALLBACK: Record<BlockId, unknown> = {
  menu: menuItems,
  hours: standardSchedule,
  locations,
  testimonials,
  // Les textes des sections ont leur propre ecran (`TextsScreen`) : leur
  // structure imbrique ne se laisse pas maitriser par l'editeur generique.
  texts: { note: "Utilisez l'onglet « Textes » pour les accroches des sections." },
};

export function ContentScreen({
  block,
  title,
  description,
}: {
  block: BlockId;
  title: string;
  description: string;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [selected, setSelected] = useState(0);

  const load = useCallback(async () => {
    setMessage(null);
    try {
      const data = await api.content();
      const payload = data[block]?.payload;
      const list = Array.isArray(payload)
        ? payload
        : isRow(payload)
          ? [payload]
          : [];
      if (list.length === 0) {
        const fallback = FALLBACK[block];
        setRows(Array.isArray(fallback) ? (fallback as Row[]) : [fallback as Row]);
        setOffline(true);
      } else {
        setRows(list as Row[]);
        setOffline(false);
      }
      setSelected(0);
      setDirty(false);
    } catch {
      const fallback = FALLBACK[block];
      setRows(Array.isArray(fallback) ? (fallback as Row[]) : [fallback as Row]);
      setOffline(true);
      setMessage({
        tone: "error",
        text: "Backend injoignable : edition desactivee.",
      });
    }
  }, [block]);

  useEffect(() => {
    load();
  }, [load]);

  const current = rows?.[selected];
  const keys = useMemo(
    () => (current ? Object.keys(current).filter((key) => !HIDDEN_FIELDS.has(key)) : []),
    [current]
  );
  /** Champs image de la fiche courante, dans l'ordre de declaration. */
  const imageKeys = useMemo(
    () => (current ? keys.filter((key) => key in IMAGE_FIELDS) : []),
    [current, keys]
  );

  function update(key: string, value: unknown) {
    setRows((list) =>
      (list ?? []).map((row, i) => (i === selected ? { ...row, [key]: value } : row))
    );
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await api.saveContent(block, rows);
      setDirty(false);
      setOffline(false);
      setMessage({ tone: "success", text: "Modifications enregistrees sur le serveur." });
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Enregistrement impossible.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card
        title={title}
        description={description}
        action={
          <ActionButton tone="primary" onClick={save} disabled={!dirty || saving || offline}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </ActionButton>
        }
      >
        {offline && (
          <div className="mb-5">
            <Notice tone="error">
              Mode lecture seule : le contenu provient des fichiers du site
              (`src/data`). Lancez le backend pour editer.
            </Notice>
          </div>
        )}

        {message && !offline && (
          <div className="mb-5">
            <Notice tone={message.tone}>{message.text}</Notice>
          </div>
        )}

        {rows && rows.length > 1 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {rows.map((row, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                aria-pressed={i === selected}
                className={cn(
                  "rounded-card border px-3 py-1.5 text-xs transition-colors",
                  i === selected
                    ? "border-gold text-gold"
                    : "border-cream/15 text-smoke hover:border-cream/30"
                )}
              >
                {String(row.name ?? row.title ?? row.days ?? `#${i + 1}`)}
              </button>
            ))}
          </div>
        )}

        {current ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Le selecteur d'image passe en premier : c'est le champ qu'on
                regarde en premier sur une fiche plat. */}
            {imageKeys.map((key) => (
              <ImagePicker
                key={key}
                label={fieldLabel(key, block)}
                value={String(current[key] ?? "")}
                onChange={(url) => update(key, url)}
                required={IMAGE_FIELDS[key]?.required}
                hint={IMAGE_FIELDS[key]?.hint}
              />
            ))}
            {keys.map((key) =>
              renderField(key, current[key], (v) => update(key, v), block)
            )}
          </div>
        ) : (
          <p className="py-6 text-sm text-smoke">Aucun contenu pour ce bloc.</p>
        )}
      </Card>
    </div>
  );
}
