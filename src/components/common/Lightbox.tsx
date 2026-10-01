import { useEffect } from "react";

interface LightboxProps {
  src: string;
  alt: string;
  /** Un visuel vidéo s'ouvre avec ses propres contrôles, pas comme une image. */
  type?: "image" | "video";
  onClose: () => void;
}

export function Lightbox({ src, alt, type = "image", onClose }: LightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal/95 p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 font-display text-sm uppercase tracking-[0.16em] text-cream/60 hover:text-gold transition-colors"
        aria-label="Fermer"
      >
        Fermer ✕
      </button>
      {type === "video" ? (
        <video
          src={src}
          controls
          autoPlay
          playsInline
          className="max-h-[85vh] max-w-full rounded-card bg-charcoal shadow-stack"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[85vh] rounded-card object-contain shadow-stack"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
