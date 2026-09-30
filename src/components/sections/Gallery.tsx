import { useState } from "react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Reveal } from "../ui/Reveal";
import { Lightbox } from "../common/Lightbox";
import { cn } from "../../utils/cn";

interface GalleryItem {
  type: "image" | "video";
  src: string;
  alt: string;
  ratio: string;
}

const items: GalleryItem[] = [
  { type: "image", src: "/images/gallery/1.svg", alt: "Brisket fumé", ratio: "row-span-2" },
  { type: "video", src: "/videos/Download (6).mp4", alt: "Cuisson au feu de bois", ratio: "" },
  { type: "image", src: "/images/gallery/2.svg", alt: "Ribs St. Louis", ratio: "" },
  { type: "video", src: "/videos/Download (7).mp4", alt: "Préparation des viandes", ratio: "row-span-2" },
  { type: "image", src: "/images/gallery/4.svg", alt: "Mac & Cheese", ratio: "" },
  { type: "video", src: "/videos/Download (8).mp4", alt: "Ambiance en salle", ratio: "" },
  { type: "image", src: "/images/gallery/5.svg", alt: "Pecan Pie", ratio: "" },
  { type: "video", src: "/videos/Download (10).mp4", alt: "Desserts maison", ratio: "" },
  { type: "image", src: "/images/gallery/6.svg", alt: "Ambiance salle", ratio: "" },
];

export function Gallery() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <section id="gallery" className="section-stack bg-cream py-24 md:py-36">
      <Container>
        <SectionHeading
          number="06"
          label="Galerie"
          title="Ça se"
          accent="mange des yeux"
          subtitle="Ce que vous voyez ici sort de nos cuisines : les mêmes planches, les mêmes portions, servies le soir même."
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[200px] md:auto-rows-[250px]">
          {items.map((item, i) => (
            <Reveal
              key={i}
              variant="scale"
              delay={i * 60}
              className={cn("rounded-[3px]", item.ratio)}
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
                {item.type === "video" ? (
                  <video
                    src={item.src}
                    muted
                    loop
                    playsInline
                    autoPlay
                    className="food-shot w-full h-full object-cover group-hover:scale-110"
                  />
                ) : (
                  <img
                    src={item.src}
                    alt={item.alt}
                    className="food-shot w-full h-full object-cover group-hover:scale-110"
                    loading="lazy"
                  />
                )}
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
          src={items[lightboxIndex].src}
          alt={items[lightboxIndex].alt}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}
