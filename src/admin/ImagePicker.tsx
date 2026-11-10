/**
 * Selecteur d'image pour l'editeur de contenu.
 *
 * Un champ image doit pouvoir tirer sa valeur de trois endroits :
 *   - la bibliotheque deposee depuis l'onglet « Medias » (`/uploads/…`) ;
 *   - les photos livrees avec le depot (`/images/…`), pour reaffecter un
 *     tirage existant ;
 *   - un envoi direct depuis cet ecran (le fichier part vers l'API et le champ
 *     prend immediatement la nouvelle adresse).
 *
 * Les cas problemes sont signales — reference vide, format inattendu — plutot
 * que d'ecrire une adresse qui ne mènerait nulle part.
 */
import { useCallback, useContext, useEffect, useState } from "react";
import { api, ApiError, type MediaFile } from "./api";
import { SessionContext } from "./SessionContext";
import { API_BASE } from "./config";
import { ActionButton, Notice, Select } from "./ui";
import { cn } from "../utils/cn";

/**
 * Photos livrees avec le depot. Liste figee : le navigateur ne peut pas
 * lister un dossier statique, et le serveur ne sert `public/images` que fichier
 * par fichier. Elle sert surtout a reaffecter les tirages existants.
 */
const REPO_IMAGES = [
  "/images/products/ribs-o-ribs.jpg",
  "/images/products/steak-filet-boeuf.jpg",
  "/images/products/poulet-texan-entier.jpg",
  "/images/gallery/1.jpg",
  "/images/gallery/2.jpg",
  "/images/gallery/3.jpg",
  "/images/gallery/4.jpg",
  "/images/gallery/5.jpg",
  "/images/gallery/6.jpg",
  "/images/gallery/7.jpg",
  "/images/locations/zone-4.jpg",
  "/images/locations/riviera-jardin.jpg",
  "/images/locations/deux-plateaux-latrille.jpg",
  "/images/locations/yopougon-maroc.jpg",
  "/images/locations/cocody-cite-des-arts.jpg",
  "/images/histoire.jpg",
];

const shortName = (url: string) => url.split("/").pop() ?? url;

/** Une adresse utilisable est une image (`.svg` reste exclu). */
export const isUsableImage = (url: string): boolean =>
  /res\.cloudinary\.com\/[^/]+\/(?:image\/upload\/)?(?:v\d+\/)?[^\s"']*\.(jpe?g|png|webp|avif)(\?.*)?$/i.test(url) ||
  /\/[^/?]+\.(jpe?g|png|webp|avif)(\?.*)?$/i.test(url);


/** URL absolue d'une image : les `/uploads` sont servis par l'API. */
const absolute = (url: string) =>
  url.startsWith("/uploads/") ? `${API_BASE}${url}` : url;

export function ImagePicker({
  label,
  value,
  onChange,
  hint,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  /** Affiche un avertissement quand aucune photo n'est associee. */
  required?: boolean;
}) {
  // Lecture tolérante de la session : hors SessionProvider (tests),
  // on retombe sur les dossiers par défaut au lieu de lever.
  const session = useContext(SessionContext);
  const user = session?.user ?? null;
  const isAdmin = Boolean(user) && (user?.role === "admin" || !user?.role);
  const ownFolder = user?.location_id ? `locations/${user.location_id}` : "products";
  // Le dossier galerie est réservé au super admin.
  const folderOptions = isAdmin
    ? [{ id: ownFolder, label: "Mon restaurant" }]
    : [
        { id: "products", label: "Plats" },
        ...(user?.role === "super_admin" ? [{ id: "gallery", label: "Galerie" }] : []),
        { id: "locations", label: "Salles" },
        { id: "misc", label: "Divers" },
      ];
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folder, setFolder] = useState(ownFolder);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.media();
      setFiles(data.files);
    } catch (cause) {
      // L'API est peut-etre indisponible : le selecteur reste utilisable avec
      // les seules photos du depot, on ne bloque pas l'edition pour autant.
      if (!(cause instanceof ApiError) || cause.status !== 401) {
        setError("Bibliotheque indisponible.");
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const result = await api.uploadMedia(folder, file);
      onChange(result.url);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Envoi impossible.");
    } finally {
      setUploading(false);
    }
  }

  const missing = required && !isUsableImage(value);

  return (
    <div className="sm:col-span-2">
      <span className="mb-1.5 block font-display text-[11px] uppercase tracking-[0.14em] text-gold">
        {label}
        {required && <span className="text-signal-bright"> *</span>}
      </span>

      <div
        className={cn(
          "flex flex-wrap items-start gap-4 rounded-card border p-3",
          missing ? "border-signal-bright/50" : "border-cream/10"
        )}
      >
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-card bg-coal">
          {value && (
            <img
              src={absolute(value)}
              alt=""
              className="h-full w-full object-cover"
              // Une adresse cassee doit se voir, pas laisser croire a un visuel.
              onError={(event) => {
                event.currentTarget.style.visibility = "hidden";
              }}
            />
          )}
          {(!value || !isUsableImage(value)) && (
            <span className="absolute inset-0 grid place-items-center text-[10px] text-ash">
              Aucune photo
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <Select
            value={files.some((file) => file.url === value) ? value : "__custom"}
            onChange={(event) => {
              if (event.target.value !== "__custom") onChange(event.target.value);
            }}
            aria-label={`${label} : choisir une image`}
          >
            <option value="__custom">
              {isUsableImage(value)
                ? `Actuelle : ${shortName(value)}`
                : "Choisir une image…"}
            </option>
            {files.length > 0 && (
              <optgroup label="Deposees (onglet Medias)">
                {files.map((file) => (
                  <option key={file.url} value={file.url}>
                    {shortName(file.url)}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Livrees avec le site">
              {REPO_IMAGES.map((url) => (
                <option key={url} value={url}>
                  {shortName(url)}
                </option>
              ))}
            </optgroup>
          </Select>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={folder}
              onChange={(event) => setFolder(event.target.value)}
              aria-label="Dossier de depot"
              className="w-32"
            >
              {folderOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </Select>

            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 rounded-card bg-gold px-3 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-coal hover:bg-gold-pale">
                {uploading ? "Envoi…" : "Envoyer une photo"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={onUpload}
                disabled={uploading}
                className="sr-only"
              />
            </label>

            {isUsableImage(value) && (
              <ActionButton onClick={() => onChange("")} className="px-3 py-2 text-[10px]">
                Retirer
              </ActionButton>
            )}
          </div>

          {hint && <p className="text-xs text-ash">{hint}</p>}
          {error && <Notice tone="error">{error}</Notice>}
          {missing && (
            <Notice tone="error">
              Aucune photo associee. Le site affichera une assiette dessinee a la
              place : ajoute une photo pour que le plat donne envie.
            </Notice>
          )}
        </div>
      </div>
    </div>
  );
}
