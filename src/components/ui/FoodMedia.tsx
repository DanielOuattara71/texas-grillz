import { useEffect, useState } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { mediaUrl } from "../../utils/photoSlot";
import { cn } from "../../utils/cn";

/**
 * Visuel de plat, pensé pour donner faim.
 *
 * Ordre de priorité :
 *  1. la boucle vidéo (`video`) — du réel qui fume, sur desktop non tactile ;
 *  2. la photo déposée dans `public/` (`photo`) — détectée toute seule ;
 *  3. l'assiette dessinée en CSS (`.food-plate`) — jamais de cadre vide.
 *
 * Emplacements photo : un plat = `public/images/products/<id>.jpg`, une
 * ambiance = `public/images/<nom>.jpg`. Dès que le fichier arrive, il
 * s'affiche : aucun code à modifier. L'SVG du même nom reste l'illustration
 * de repli et le visuel mobile par défaut.
 */
type PhotoState = "ready" | "missing";

/** Sonde l'existence d'un visuel, sans rechargement ni rendu en cascade. */
function usePhotoState(photo?: string): PhotoState | "unknown" {
  const [states, setStates] = useState<Record<string, PhotoState>>({});

  useEffect(() => {
    if (!photo) return;

    let alive = true;
    // La sonde vise l'adresse reellement affichee : une photo `/uploads/…`
    // n'existe que sur l'API, tester le chemin brut la declarerait absente et le
    // site retomberait a tort sur l'assiette dessinee.
    const probe = new Image();
    probe.onload = () => {
      if (alive) setStates((current) => ({ ...current, [photo]: "ready" }));
    };
    probe.onerror = () => {
      if (alive) setStates((current) => ({ ...current, [photo]: "missing" }));
    };
    probe.src = mediaUrl(photo);

    return () => {
      alive = false;
    };
  }, [photo]);

  if (!photo) return "missing";
  return states[photo] ?? "unknown";
}

export interface FoodPlateProps {
  /** Nom du plat, affiché en filigrane sur l'assiette. */
  label: string;
  /** Chemin attendu pour la photo réelle (indiqué en développement). */
  photo?: string;
  className?: string;
}

/** Prise « photo à venir » : chaud, texturé, volontairement appétissant. */
export function FoodPlate({ label, photo, className }: FoodPlateProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "food-plate flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="display-title text-[clamp(1.1rem,3vw,2.1rem)] text-cream/35"
      >
        {label}
      </span>
      <span aria-hidden="true" className="h-px w-10 bg-ember/70" />
      {import.meta.env.DEV && photo ? (
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-honey/85">
          dépôt : {photo}
        </span>
      ) : null}
    </div>
  );
}

export interface FoodMediaProps {
  /** Nom du plat ou de l'ambiance, repris par l'assiette de repli. */
  label: string;
  /** Texte alternatif accessible. */
  alt: string;
  /** Photo réelle déposée dans `public/`. */
  photo?: string;
  /** Boucle vidéo appétissante (prioritaire sur desktop). */
  video?: string;
  /** true pour un visuel visible dès le chargement (au-dessus de la ligne de flottaison). */
  eager?: boolean;
  className?: string;
}

export function FoodMedia({
  label,
  alt,
  photo,
  video,
  eager = false,
  className,
}: FoodMediaProps) {
  /* Boucle vidéo seulement sur grand écran à pointeur, et si le mouvement
     n'est pas refusé : 5 Mo économisés sur mobile, RML respecté. */
  const richVideo = useMediaQuery(
    "(min-width: 1024px) and (hover: hover) and (prefers-reduced-motion: no-preference)"
  );
  const photoState = usePhotoState(photo);

  if (video && richVideo) {
    return (
      <video
        src={mediaUrl(video)}
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        aria-hidden="true"
        className={cn("food-shot h-full w-full object-cover", className)}
      />
    );
  }

  if (photo && photoState === "ready") {
    return (
      <img
        src={mediaUrl(photo)}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={cn("food-shot h-full w-full object-cover", className)}
      />
    );
  }

  return <FoodPlate label={label} photo={photo} className={className} />;
}
