/**
 * Medias : envoi et suppression des photos.
 *
 * Les images deposees par l'admin sont servies par le backend sous /uploads ;
 * celles du depot restent dans public/images et ne sont pas listees ici (elles
 * sont versionnees avec le site). Pour changer la photo d'un plat ou d'une
 * vignette de galerie, l'editeur de contenu propose cette bibliotheque.
 */
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type MediaFile } from "./api";
import { API_BASE } from "./config";
import { ActionButton, Card, Notice, Select } from "./ui";

const KB = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
    : `${Math.round(bytes / 1024)} Ko`;

const FOLDER_LABELS: Record<string, string> = {
  products: "Plats de la carte",
  gallery: "Galerie",
  locations: "Salles",
  misc: "Divers",
};

export function MediaScreen() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folder, setFolder] = useState("products");
  const [folders, setFolders] = useState<string[]>(["products"]);
  const [maxBytes, setMaxBytes] = useState(8 * 1024 * 1024);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.media();
      setFiles(data.files);
      setFolders(data.folders);
      setMaxBytes(data.maxBytes);
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Chargement impossible.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permet de renvoyer deux fois le meme fichier
    if (!file) return;

    setUploading(true);
    setMessage(null);
    try {
      const result = await api.uploadMedia(folder, file);
      setMessage({ tone: "success", text: `${result.name} deposee.` });
      await load();
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Envoi impossible.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(file: MediaFile) {
    // Le fichier peut deja etre reference par un plat ou une vignette : on
    // demande confirmation explicite, la suppression est irreversible.
    const confirmed = window.confirm(
      `Supprimer ${file.name} ?\n\nSi un plat ou une vignette l'utilise, son visuel disparait du site.`
    );
    if (!confirmed) return;

    try {
      await api.deleteMedia(file.url);
      setMessage({ tone: "success", text: `${file.name} supprimee.` });
      await load();
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Suppression impossible.",
      });
    }
  }

  const visible = files.filter((file) => file.folder === folder);


  return (
    <div className="space-y-6">
      <Card
        title="Medias"
        description={`${files.length} image(s) deposee(s). JPEG, PNG, WebP ou AVIF, ${KB(maxBytes)} maximum.`}
      >
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
              Destination
            </span>
            <Select value={folder} onChange={(e) => setFolder(e.target.value)}>
              {folders.map((entry) => (
                <option key={entry} value={entry}>
                  {FOLDER_LABELS[entry] ?? entry}
                </option>
              ))}
            </Select>
          </label>

          <label className="block">
            <span className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
              Envoyer une photo
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={onPick}
              disabled={uploading}
              className="text-sm text-smoke file:mr-3 file:rounded-card file:border-0 file:bg-gold file:px-4 file:py-2 file:font-display file:text-[11px] file:uppercase file:tracking-[0.14em] file:text-coal"
            />
          </label>

          {uploading && <span className="text-sm text-smoke">Envoi en cours…</span>}
        </div>

        {message && (
          <div className="mt-5">
            <Notice tone={message.tone}>{message.text}</Notice>
          </div>
        )}

        <p className="mt-5 text-xs text-ash">
          Le nom du fichier est normalise (accents retires) et un suffixe unique
          est ajoute : deux photos nommees <code className="font-mono">brisket.jpg</code>{" "}
          ne s&apos;ecrasent jamais.
        </p>
      </Card>

      <Card title={FOLDER_LABELS[folder] ?? folder}>
        {loading ? (
          <p className="py-6 text-sm text-smoke">Chargement…</p>
        ) : visible.length === 0 ? (
          <p className="py-6 text-sm text-smoke">
            Aucune image dans ce dossier. Utilisez le champ ci-dessus.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((file) => (
              <li
                key={file.url}
                className="overflow-hidden rounded-card border border-cream/10 bg-black/20"
              >
                <div className="aspect-[4/3] overflow-hidden bg-coal">
                  <img
                    src={`${API_BASE}${file.url}`}
                    alt={file.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="truncate text-xs text-cream" title={file.name}>
                    {file.name}
                  </p>
                  <p className="mt-1 text-xs text-ash">{KB(file.bytes)}</p>
                  <div className="mt-2 flex gap-2">
                    <ActionButton
                      className="px-2 py-1 text-[10px]"
                      onClick={() => {
                        void navigator.clipboard?.writeText(`${API_BASE}${file.url}`);
                        setMessage({ tone: "success", text: "Adresse copiee." });
                      }}
                    >
                      Copier
                    </ActionButton>
                    <ActionButton
                      tone="danger"
                      className="px-2 py-1 text-[10px]"
                      onClick={() => void onDelete(file)}
                    >
                      Supprimer
                    </ActionButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
