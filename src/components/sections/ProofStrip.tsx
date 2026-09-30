import { Container } from "../ui/Container";
import { Stat } from "../ui/Stat";
import { Rotator } from "../ui/Rotator";
import { CautionTape } from "../ui/CautionTape";
import { proofs, site } from "../../data/site";
import { cn } from "../../utils/cn";

/**
 * Bandeau de preuve : le noir de l'affiche. Grillage, projecteur chaud, ruban
 * de chantier, touche de pinceau et tampon d'encre — mais uniquement des
 * données réelles (`proofs`, coupes du soir, adresse) : rien n'est inventé.
 */
export function ProofStrip() {
  return (
    <section className="relative overflow-hidden bg-black">
      {/* Plans décoratifs de l'affiche, sans le mur : grillage + projecteur chaud */}
      <div className="poster-bloom absolute inset-0 opacity-[0.35]" aria-hidden="true" />
      <div
        className="fence-mesh absolute inset-0 opacity-[0.16] mix-blend-screen"
        aria-hidden="true"
      />

      {/* Tampon d'encre du lieu, posé en biais comme sur l'affiche */}
      <span className="stamp-ink absolute right-6 bottom-5 z-20 hidden -rotate-6 px-3 py-1 text-[13px] leading-none md:inline-block">
        Lyon 3ᵉ
      </span>

      <CautionTape rotate={-1.1}>Fumé au feu de hêtre — Lyon 3ᵉ</CautionTape>

      <Container className="relative py-12 md:py-16">
        <div className="grid grid-cols-2 gap-y-10 md:grid-cols-4 md:gap-y-0">
          {proofs.map((proof, i) => (
            <div
              key={proof.label}
              className={cn(
                "md:px-8",
                i > 0 && "md:border-l md:border-cream/10",
                i === 0 && "md:pl-0",
                i === proofs.length - 1 && "md:pr-0"
              )}
            >
              <Stat proof={proof} />
            </div>
          ))}
        </div>

        <div className="mt-11 flex flex-col gap-5 border-t border-cream/15 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-[11px] uppercase tracking-[0.2em] text-cream/80">
            Ce soir au feu de hêtre :{" "}
            <span className="brush-chip -mx-1 px-1 font-serif text-[19px] italic normal-case tracking-normal text-cream">
              <Rotator words={site.tonight} />
            </span>
          </p>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 self-start whitespace-nowrap border border-caution/70 px-5 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-caution transition-colors duration-200 hover:bg-caution hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caution sm:self-auto"
          >
            <span>Réserver une table</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </Container>
    </section>
  );
}
