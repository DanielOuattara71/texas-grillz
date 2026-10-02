/**
 * Photographies des plats.
 *
 * Le site reserve un emplacement a chaque plat (`public/images/products/<id>.jpg`,
 * ou une image deposee depuis l'admin). Cet ecran montre ce qui est couvert et
 * ce qui manque, et permet de deposer la photo manquante directement depuis la
 * fiche du plat : on ne cherche pas un fichier sur son disque pour decouvrir
 * qu'il n'est pas associe.
 *
 * La regle : un plat sans photo s'affiche sur une assiette dessinee. Ce n'est
 * pas casse, mais c'est le meilleur moyen de faire perdre envie — l'avertissement
 * reste donc visible tant qu'il n'y a pas de photo.
 */
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type MediaFile } from "./api";
import { Card, Notice } from "./ui";
import { ImagePicker, isUsableImage } from "./ImagePicker";
import { useContent } from "../content/store";
import { menuItems as deliveredMenu, type MenuItem } from "../data/menu";
import { photoSlot } from "../utils/photoSlot";

/** Une photo est consideree associee si l'adresse est une vraie image. */
const hasPhoto = (item: MenuItem) => isUsableImage(photoSlot(item.image ?? ""));

const KB = (bytes: number) => `${Math.round(bytes / 1024)} Ko`;

export function DishPhotosScreen() {
  // La carte affichée par le site, c'est-à-dire celle issue de l'API si elle a
  // été modifiée depuis l'admin.
  const { menu, fromApi } = useContent();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [draft, setDraft] = useState<MenuItem[] | null>(null);
  const [selected, setSelected] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const items = draft ?? (menu.length > 0 ? menu : deliveredMenu);

  useEffect(() => {
    setDraft(null);
    setDirty(false);
  }, [menu]);

  const load = useCallback(async () => {
    try {
      const data = await api.media();
      setFiles(data.files);
    } catch {
      // Sans API, l'edition est impossible : le selecteur le signale deja.
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Photos deposees pour ce plat, par correspondance de nom de fichier. */
  const suggestions = useCallback(
    (item: MenuItem) =>
      files.filter(
        (file) =>
          file.folder === "products" &&
          file.name.toLowerCase().startsWith(item.id.toLowerCase())
      ),
    [files]
  );

  const missing = items.filter((item) => !hasPhoto(item)).length;

  function update(id: string, url: string) {
    setDraft(
      (items as MenuItem[]).map((item) =>
        item.id === id ? { ...item, image: url } : item
      )
    );
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      // On renvoie la carte complete : l'API remplace le bloc, on ne peut donc
      // pas n'ecrire qu'un seul champ a la fois.
      await api.saveContent("menu", draft ?? items);
      setDirty(false);
      setMessage({ tone: "success", text: "Photographies enregistrees." });
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Enregistrement impossible.",
      });
    } finally {
      setSaving(false);
    }
  }

  const current = items[selected];
  const currentPhotos = current ? suggestions(current) : [];

  return (
    <div className="space-y-6">
      <Card
        title="Photographies des plats"
        description={
          missing === 0
            ? `Les ${items.length} plats ont une photo.`
            : `${missing} plat(s) sans photo sur ${items.length}.`
        }
        action={
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="rounded-card bg-gold px-4 py-2 font-display text-[11px] uppercase tracking-[0.14em] text-coal transition-colors hover:bg-gold-pale disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        }
      >
        {missing > 0 && (
          <div className="mb-5">
            <Notice tone="error">
              {missing} plat(s) s&apos;affichent sur une assiette dessinee plutot
              qu&apos;une vraie photo. C&apos;est la partie du site qui donne
              le plus envie : une photo par plat vaut mieux qu&apos;aucune.
            </Notice>
          </div>
        )}

        {message && (
          <div className="mb-5">
            <Notice tone={message.tone}>{message.text}</Notice>
          </div>
        )}

        {fromApi && (
          <p className="mb-5 text-xs text-ash">
            Carte issue du backend : les modifications remplacent l&apos;ensemble
            des plats, y compris leurs prix et descriptions.
          </p>
        )}

        <ul className="mb-6 flex flex-wrap gap-2">
          {items.map((item, index) => {
            const ok = hasPhoto(item);
            return (
              <li key={item.id}>
                <button
                  onClick={() => setSelected(index)}
                  aria-pressed={index === selected}
                  className={[
                    "flex items-center gap-2 rounded-card border px-3 py-1.5 text-xs transition-colors",
                    index === selected
                      ? "border-gold text-gold"
                      : "border-cream/15 text-smoke hover:border-cream/30",
                  ].join(" ")}
                >
                  {/* Pastille : verte si la photo existe, rouge sinon. La
                      couleur n'est pas le seul signal — le libelle suit. */}
                  <span
                    aria-hidden="true"
                    className={ok ? "text-caution" : "text-signal-bright"}
                  >
                    {ok ? "●" : "○"}
                  </span>
                  {item.name}
                  {!ok && <span className="sr-only">(sans photo)</span>}
                </button>
              </li>
            );
          })}
        </ul>

        {current && (
          <div className="space-y-4">
            <ImagePicker
              label={`Photo — ${current.name}`}
              value={photoSlot(current.image ?? "")}
              onChange={(url) => update(current.id, url)}
              required
              hint="Dépose la photo, choisis-la dans la bibliothèque, ou reprends un tirage livré avec le site."
            />

            {currentPhotos.length > 0 && (
              <Notice tone="info">
                {currentPhotos.length} image(s) deja deposee(s) portent un nom
                commencant par « {current.id} » :{' '}
                {currentPhotos.map((file) => `${file.name} (${KB(file.bytes)})`).join(", ")}
              </Notice>
            )}

            {!hasPhoto(current) && (
              <p className="text-sm text-signal-bright">
                Aucune photo associee a {current.name}. Le site drew une assiette
                a la place.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

