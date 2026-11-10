/**
 * Edition des textes du site.
 *
 * Les textes des sections sont imbriques (en-têtes, chapitres, listes) :
 * l'editeur generique (`ContentScreen`) ne sait pas les presenter. Cet ecran
 * les unfold section par section, avec un repli sur les valeurs livrees si le
 * backend est indisponible.
 *
 * Seuls les champs modifes sont renvoyes : le store fusionne le reste sur les
 * textes livres, donc un message enregistre ici ne vide pas les autres
 * sections.
 */
import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { ActionButton, Card, Notice, TextInput, TextArea } from "./ui";
import { useContent } from "../content/store";
import type { SiteTexts, HistoryTexts } from "../data/texts";

const SECTIONS: { key: keyof SiteTexts; label: string }[] = [
  { key: "hero", label: "Hero (accueil)" },
  { key: "proof", label: "Bandeau de preuve" },
  { key: "cravings", label: "Section « Ça fume »" },
  { key: "concept", label: "Section « Fumé, jamais pressé »" },
  { key: "services", label: "Section « Quatre Signatures »" },
  { key: "menu", label: "Section « La Carte »" },
  { key: "locations", label: "Section « Nos Lieux »" },
  { key: "gallery", label: "Section « Galerie »" },
  { key: "testimonials", label: "Section « Avis »" },
  { key: "info", label: "Section « Infos pratiques »" },
  { key: "contact", label: "Section « Réservation »" },
  { key: "nav", label: "Barre de navigation" },
];

/** Un en-tete de section : pastille, sur-titre, titre, accent, accroche. */
function HeadingFields({
  value,
  onChange,
}: {
  value: { number?: string; label: string; title: string; accent?: string; subtitle?: string };
  onChange: (patch: Record<string, string>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
          Numéro de pastille
        </span>
        <TextInput
          value={value.number ?? ""}
          onChange={(e) => onChange({ number: e.target.value })}
          placeholder="01"
          className="w-24"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
          Sur-titre
        </span>
        <TextInput
          value={value.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Notre histoire"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
          Titre principal
        </span>
        <TextInput
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Fumé,"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
          Accent (italique)
        </span>
        <TextInput
          value={value.accent ?? ""}
          onChange={(e) => onChange({ accent: e.target.value })}
          placeholder="jamais pressé"
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
          Accroche
        </span>
        <TextArea
          rows={3}
          value={value.subtitle ?? ""}
          onChange={(e) => onChange({ subtitle: e.target.value })}
        />
      </label>
    </div>
  );
}

/** Un champ texte simple, pour les sections qui n'ont pas d'en-tête. */
function Field({
  label,
  value,
  onChange,
  rows = 1,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
        {label}
      </span>
      {rows > 1 ? (
        <TextArea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <TextInput value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

export function TextsScreen({ locationId = null }: { locationId?: string | null }) {
  const { texts: live, historyTexts: liveHistory } = useContent();
  const [draft, setDraft] = useState<SiteTexts | null>(null);
  const [draftHistory, setDraftHistory] = useState<HistoryTexts | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  // Cle de contenu : globale (`texts`) ou par siege (`<locationId>:texts`).
  const textsKey = locationId ? `${locationId}:texts` : "texts";
  const historyKey = locationId ? `${locationId}:historyTexts` : "historyTexts";

  useEffect(() => {
    setDraft(null);
    setDraftHistory(null);
    setDirty(false);
  }, [live, liveHistory]);

  // Siege edite : ses textes sont charges depuis l'API via la cle
  // `<locationId>:texts`, sinon on retombe sur les textes du store.
  useEffect(() => {
    if (!locationId) return;
    let alive = true;
    (async () => {
      try {
        const data = await api.content();
        const textsPayload = data[`${locationId}:texts`]?.payload;
        const historyPayload = data[`${locationId}:historyTexts`]?.payload;
        if (!alive) return;
        if (textsPayload) setDraft(textsPayload as SiteTexts);
        if (historyPayload) setDraftHistory(historyPayload as HistoryTexts);
      } catch {
        // Sans API : le contenu global du store reste la source.
      }
    })();
    return () => {
      alive = false;
    };
  }, [locationId]);

  const current = draft ?? live;
  const currentHistory = draftHistory ?? liveHistory;

  /** Modifie une section ; `path` est le chemin de la cle dans `texts`. */
  function patch(key: keyof SiteTexts, value: unknown) {
    setDraft({ ...current, [key]: value } as SiteTexts);
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await api.saveContent(textsKey, draft ?? current);
      if (draftHistory) await api.saveContent(historyKey, draftHistory);
      setDirty(false);
      setMessage({ tone: "success", text: "Textes enregistres." });
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Enregistrement impossible.",
      });
    } finally {
      setSaving(false);
    }
  }

  /** Sections presentees via `HeadingFields` : pastille, titre, accent, accroche. */
  const headings: (keyof SiteTexts)[] = [
    "cravings",
    "concept",
    "services",
    "menu",
    "locations",
    "gallery",
    "testimonials",
    "info",
    "contact",
  ];
  const isHeading = (key: keyof SiteTexts) => headings.includes(key);

  return (
    <div className="space-y-6">
      <Card
        title="Textes du site"
        description="Accroches, titres et sous-titres. Modifiables sans toucher au code."
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
        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        <p className="mt-4 text-sm text-smoke">
          Les textes de la carte, des adresses et des avis se modifient dans
          leurs propres onglets. Ici, ce sont les phrases de l&apos;affichette.
        </p>
      </Card>

      {SECTIONS.map(({ key, label }) => {
        const value = current[key] as unknown as Record<string, unknown>;
        return (
          <Card key={String(key)} title={label}>
            {isHeading(key) ? (
              <HeadingFields
                value={value as never}
                onChange={(next) => patch(key, { ...value, ...next })}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(value).map(([field, entry]) => (
                  <div
                    key={field}
                    className={
                      field === "paragraphs" || field === "chapters" ? "sm:col-span-2" : ""
                    }
                  >
                    <Field
                      label={field}
                      rows={typeof entry === "string" && entry.length > 60 ? 3 : 1}
                      value={Array.isArray(entry) ? entry.join("\n") : String(entry ?? "")}
                      onChange={(next) =>
                        patch(key, {
                          ...value,
                          [field]: Array.isArray(entry)
                            ? next.split("\n").filter(Boolean)
                            : next,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      <Card title="Page Histoire">
        <div className="space-y-6">
          {currentHistory.chapters.map((chapter, index) => (
            <div key={chapter.title} className="border-t border-cream/10 pt-5 first:border-0 first:pt-0">
              <p className="mb-3 font-display text-sm text-cream">{chapter.title}</p>
              <div className="grid gap-4">
                <Field
                  label="Sur-titre"
                  value={chapter.title}
                  onChange={(next) => {
                    const chapters = [...currentHistory.chapters];
                    chapters[index] = { ...chapter, title: next };
                    setDraftHistory({ ...currentHistory, chapters });
                    setDirty(true);
                  }}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Titre (1re partie)"
                    value={chapter.heading[0]}
                    onChange={(next) => {
                      const chapters = [...currentHistory.chapters];
                      chapters[index] = {
                        ...chapter,
                        heading: [next, chapter.heading[1]],
                      };
                      setDraftHistory({ ...currentHistory, chapters });
                      setDirty(true);
                    }}
                  />
                  <Field
                    label="Titre (accent, en or)"
                    value={chapter.heading[1]}
                    onChange={(next) => {
                      const chapters = [...currentHistory.chapters];
                      chapters[index] = {
                        ...chapter,
                        heading: [chapter.heading[0], next],
                      };
                      setDraftHistory({ ...currentHistory, chapters });
                      setDirty(true);
                    }}
                  />
                </div>
                <Field
                  label="Paragraphes (un par ligne, vide = nouveau paragraphe)"
                  rows={5}
                  value={chapter.paragraphs.join("\n")}
                  onChange={(next) => {
                    const chapters = [...currentHistory.chapters];
                    chapters[index] = {
                      ...chapter,
                      paragraphs: next.split("\n").filter(Boolean),
                    };
                    setDraftHistory({ ...currentHistory, chapters });
                    setDirty(true);
                  }}
                />
              </div>
            </div>
          ))}

          <Field
            label="Citation du fondateur"
            rows={4}
            value={currentHistory.quote}
            onChange={(next) => {
              setDraftHistory({ ...currentHistory, quote: next });
              setDirty(true);
            }}
          />
        </div>
      </Card>
    </div>
  );
}
