import { useState } from "react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Reveal } from "../ui/Reveal";
import { Lightbox } from "../common/Lightbox";
import { FoodMedia } from "../ui/FoodMedia";
import { mediaUrl } from "../../utils/photoSlot";
import { useContent } from "../../content/store";
import { cn } from "../../utils/cn";

/**
 * Galerie : tirages du restaurant et boucles de braise.
 *
 * La liste vient du contenu charge depuis l'API (editable dans l'admin) et
 * retombe sur `data/visuals.ts` si le backend est indisponible. Les boucles
 * passent par `FoodMedia` : elles ne se chargent que sur écran à pointeur sans
 * mouvement refusé — 66 Mo économisés sur mobile, où l'assiette dessinée prend
 * le relais.
 */
export function Gallery() {
  const { gallery, texts } = useContent();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (gallery.length === 0) return null;

  return (
    <section id="gallery" className="section-stack bg-cream py-24 md:py-36">
      <Container>
        <SectionHeading
          number={texts.gallery.number}
          label={texts.gallery.label}
          title={texts.gallery.title}
          accent={texts.gallery.accent}
          subtitle={texts.gallery.subtitle}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[200px] md:auto-rows-[250px]">
          {gallery.map((item, i) => (
            <Reveal
              key={i}
              variant="scale"
              delay={i * 60}
              className={cn("rounded-[3px]", item.ratio ?? "")}
            >
              <button
                onClick={() => setLightboxIndex(i)}
                className={cn(
                  "group relative block h-full w-full cursor-pointer overflow-hidden rounded-[3px] border-[3px] border-cream",
                  "shadow-[0_12px_26px_-16px_rgba(28,25,23,0.55)] transition-transform duration-300 hover:-translate-y-0.5",
                  i % 2 === 0 ? "-rotate-[0.7deg]" : "rotate-[0.7deg]"
                )}
                aria-label={`Agrandir : ${item.alt}`}
              >
                <FoodMedia
                  label={item.alt}
                  alt={item.alt}
                  photo={item.type === "image" ? item.src : undefined}
                  video={item.type === "video" ? item.src : undefined}
                />
                <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/40 transition-colors duration-300 flex items-center justify-center">
                  {item.type === "video" && (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-gold text-4xl">
                      ▶
                    </span>
                  )}
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </Container>

      {lightboxIndex !== null && (
        <Lightbox
          src={mediaUrl(gallery[lightboxIndex].src)}
          alt={gallery[lightboxIndex].alt}
          type={gallery[lightboxIndex].type}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}
