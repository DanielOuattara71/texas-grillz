/**
 * Bibliothèque de médias partagée par « Mes médias » (gérant) et
 * « Gestion des visuels » (super admin).
 *
 * - scope `super` : tous les dossiers de l'API, SAUF « products » (photos des
 *   plats : le super admin n'y touche pas — réservées aux gérants) ;
 * - scope `admin` : son restaurant uniquement (déjà restreint côté serveur) ;
 * - affichage en grille de cartes : miniature, nom, taille, dossier,
 *   aperçu du nombre d'usages, copie de l'adresse, suppression protégée si
 *   l'image est encore utilisée (le serveur refuse avec 409 + la liste).
 */
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type MediaFile } from "./api";
import { API_BASE } from "./config";
import { Select, Notice } from "./ui";

const KB = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
    : `${Math.round(bytes / 1024)} Ko`;

const FOLDER_LABELS: Record<string, string> = {
  products: "Plats (gérants)",
  gallery: "Galerie du site",
  locations: "Adresses",
  misc: "Divers",
};

function folderLabel(folder: string): string {
  if (FOLDER_LABELS[folder]) return FOLDER_LABELS[folder];
  if (folder.startsWith("locations/")) return `Restaurant ${folder.slice("locations/".length)}`;
  return folder;
}

export interface MediaUsageRef {
  surface: string;
  id: string;
  label: string;
}

export function MediaLibrary({ scope }: { scope: "super" | "admin" }) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folder, setFolder] = useState<string>(scope === "super" ? "gallery" : "");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [maxBytes, setMaxBytes] = useState(8 * 1024 * 1024);
  const [usage, setUsage] = useState<{ url: string; refs: MediaUsageRef[] } | null>(null);
  const [usageBusy, setUsageBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.media();
      setFiles(data.files);
      setMaxBytes(data.maxBytes);
      // Dossiers de l'API, moins « products » pour le super admin, +
      // les sous-dossiers découverts dans la liste de fichiers.
      const discovered = Array.from(new Set(data.files.map((f) => f.folder)));
      const base = scope === "super" ? ["gallery", "locations", "misc", ...discovered] : data.folders;
      const unique = Array.from(new Set(base)).sort((a, b) => folderLabel(a).localeCompare(folderLabel(b)));
      setFolder((current) => (current && unique.includes(current) ? current : unique[0] ?? ""));
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Chargement impossible.",
      });
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !folder) return;
    setUploading(true);
    setMessage(null);
    try {
      const result = await api.uploadMedia(folder, file);
      setMessage({ tone: "success", text: `${result.name} déposée dans « ${folderLabel(folder)} ».` });
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

  async function showUsage(file: MediaFile) {
    setUsageBusy(true);
    setUsage(null);
    try {
      const data = await api.mediaUsage(file.url);
      setUsage({ url: file.url, refs: data.refs });
    } catch (cause) {
      setMessage({
        tone: "error",
        text: cause instanceof ApiError ? cause.message : "Usage indisponible.",
      });
    } finally {
      setUsageBusy(false);
    }
  }

  async function remove(file: MediaFile) {
    // Les usages sont affichés avant la suppression : pas de coupure aveugle.
    if (scope === "super") {
      try {
        const data = await api.mediaUsage(file.url);
        if (data.refs.length > 0) {
          setUsage({ url: file.url, refs: data.refs });
          setMessage({
            tone: "error",
            text: `« ${file.name} » est toujours utilisée : détachez-la d'abord (voir ci-dessous).`,
          });
          return;
        }
      } catch {
        setMessage({ tone: "error", text: "Impossible de vérifier les usages." });
        return;
      }
    }
    const confirmed = window.confirm(
      `Supprimer « ${file.name} » ?\n\nSi le site l'utilisait, le visuel disparaîtrait. Cette action est définitive.`
    );
    if (!confirmed) return;
    try {
      await api.deleteMedia(file.url);
      setMessage({ tone: "success", text: `${file.name} supprimée.` });
      setUsage(null);
      await load();
    } catch (cause) {
      const text = cause instanceof ApiError ? cause.message : "Suppression impossible.";
      setMessage({ tone: "error", text });
    }
  }

  const visible = files.filter((file) => file.folder === folder);
  const folders = Array.from(new Set([...files.map((f) => f.folder), ...(scope === "super" ? ["gallery", "locations", "misc"] : [])]))
    .sort((a, b) => folderLabel(a).localeCompare(folderLabel(b)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
            Dossier
          </span>
          <Select value={folder} onChange={(e) => setFolder(e.target.value)} aria-label="Dossier">
            {folders.map((entry) => (
              <option key={entry} value={entry}>
                {folderLabel(entry)}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
            Envoyer une image
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={onPick}
            disabled={uploading}
            className="text-sm text-smoke file:mr-3 file:rounded-card file:border-0 file:bg-gold file:px-4 file:py-2 file:font-display file:text-[11px] file:uppercase file:tracking-[0.14em] file:text-coal"
          />
        </label>
        {uploading && <span className="pb-2 text-sm text-smoke">Envoi…</span>}
        <p className="pb-2 text-xs text-ash">JPEG, PNG, WebP ou AVIF · {KB(maxBytes)} max</p>
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {usage && (
        <Notice tone={usage.refs.length > 0 ? "error" : "info"}>
          <p className="font-display text-[11px] uppercase tracking-[0.14em] text-gold">
            Utilisée à ({usage.refs.length})
          </p>
          {usage.refs.length === 0 ? (
            <p className="mt-1 text-sm">Cette image n'est référencée nulle part.</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-sm">
              {usage.refs.map((ref, index) => (
                <li key={`${ref.surface}-${ref.id}-${index}`}>
                  <strong>{ref.surface}</strong> · {ref.label} <span className="text-smoke">({ref.id})</span>
                </li>
              ))}
            </ul>
          )}
        </Notice>
      )}

      {loading ? (
        <p className="py-6 text-sm text-smoke">Chargement…</p>
      ) : visible.length === 0 ? (
        <p className="py-6 text-sm text-smoke">
          Aucune image dans « {folderLabel(folder)} ». Déposez-en une ci-dessus, puis placez-la dans un emplacement ou la galerie.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((file) => {
            const external = /^https?:\/\//.test(file.url);
            const src = external ? file.url : `${API_BASE}${file.url}`;
            return (
              <li key={file.url} className="overflow-hidden rounded-card border border-cream/10 bg-black/20">
                <div className="aspect-[4/3] overflow-hidden bg-coal">
                  <img src={src} alt={file.name} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="p-3">
                  <p className="truncate text-xs text-cream" title={file.name}>{file.name}</p>
                  <p className="mt-0.5 text-[11px] text-ash">{KB(file.bytes)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {scope === "super" && (
                      <button
                        type="button"
                        onClick={() => void showUsage(file)}
                        disabled={usageBusy}
                        className="rounded-card border border-cream/15 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-smoke transition-colors hover:border-gold hover:text-gold disabled:opacity-40"
                      >
                        Où ?
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(`${src}`);
                        setMessage({ tone: "success", text: "Adresse copiée." });
                      }}
                      className="rounded-card border border-cream/15 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-smoke transition-colors hover:border-gold hover:text-gold"
                    >
                      Copier
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(file)}
                      className="rounded-card border border-signal-bright/40 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-signal-bright transition-colors hover:border-signal-bright"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
