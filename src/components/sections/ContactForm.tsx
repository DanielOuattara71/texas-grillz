import { useState, type FormEvent } from "react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Reveal } from "../ui/Reveal";
import { Button } from "../ui/Button";
import { AvailabilityPill } from "../ui/AvailabilityPill";
import { useAvailability } from "../../hooks/useAvailability";

interface FormData {
  name: string;
  email: string;
  phone: string;
  date: string;
  guests: string;
  message: string;
}

const initialData: FormData = {
  name: "",
  email: "",
  phone: "",
  date: "",
  guests: "2",
  message: "",
};

export function ContactForm() {
  const [formData, setFormData] = useState<FormData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  // Recalculée chaque minute : la pastille reste exacte si l'onglet reste ouvert.
  const availability = useAvailability();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSubmitted(true);
    setFormData(initialData);
  };

  if (isSubmitted) {
    return (
      <section id="contact" className="section-stack bg-charcoal py-24 md:py-36">
        <Container>
          <Reveal variant="scale">
            <div className="max-w-lg mx-auto text-center">
              <div className="w-20 h-20 rounded-full bg-gold/15 flex items-center justify-center mx-auto mb-6">
                <span className="text-gold text-3xl">✓</span>
              </div>
              <h2 className="font-display text-3xl text-cream font-semibold mb-4">
                Demande envoyée
              </h2>
              <p className="text-smoke leading-relaxed">
                Merci pour votre demande de réservation. Nous vous confirmerons
                par email dans les plus brefs délais.
              </p>
              <div className="mt-8">
                <Button variant="secondary" className="border-cream/30 text-cream hover:border-gold hover:text-gold" onClick={() => setIsSubmitted(false)}>
                  Nouvelle demande
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    );
  }

  return (
    <section id="contact" className="section-stack bg-charcoal py-24 md:py-36">
      <Container>
        <SectionHeading
          number="09"
          label="Réservation"
          title="Réservez votre"
          accent="Table"
          subtitle="Remplissez le formulaire ci-dessous et nous vous confirmerons votre réservation par email."
          dark
        />

        <Reveal variant="up">
          <div className="-mt-8 mb-10 flex justify-center">
            <AvailabilityPill {...availability} />
          </div>
        </Reveal>

        <Reveal variant="up">
          <form onSubmit={handleSubmit} className="card-surface-dark mx-auto max-w-2xl p-8 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-smoke text-sm mb-2">
                  Nom complet *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-card border border-gold/20 bg-cream/5 px-4 py-3 text-cream placeholder-ash focus:border-gold focus:outline-none transition-colors"
                  placeholder="Votre nom"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-smoke text-sm mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-card border border-gold/20 bg-cream/5 px-4 py-3 text-cream placeholder-ash focus:border-gold focus:outline-none transition-colors"
                  placeholder="votre@email.com"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-smoke text-sm mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-card border border-gold/20 bg-cream/5 px-4 py-3 text-cream placeholder-ash focus:border-gold focus:outline-none transition-colors"
                  placeholder="06 12 34 56 78"
                />
              </div>
              <div>
                <label htmlFor="date" className="block text-smoke text-sm mb-2">
                  Date souhaitée *
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full rounded-card border border-gold/20 bg-cream/5 px-4 py-3 text-cream placeholder-ash focus:border-gold focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label htmlFor="guests" className="block text-smoke text-sm mb-2">
                  Nombre de convives *
                </label>
                <select
                  id="guests"
                  name="guests"
                  value={formData.guests}
                  onChange={handleChange}
                  required
                  className="w-full rounded-card border border-gold/20 bg-cream/5 px-4 py-3 text-cream focus:border-gold focus:outline-none transition-colors"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} {n > 1 ? "personnes" : "personne"}
                    </option>
                  ))}
                  <option value="9+">9+ personnes</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="message" className="block text-smoke text-sm mb-2">
                  Message (allergies, demandes spéciales...)
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-card border border-gold/20 bg-cream/5 px-4 py-3 text-cream placeholder-ash focus:border-gold focus:outline-none transition-colors resize-none"
                  placeholder="Précisez vos demandes..."
                />
              </div>
            </div>

            <div className="mt-8 text-center">
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Envoi en cours..." : "Envoyer la demande"}
              </Button>
            </div>
          </form>
        </Reveal>
      </Container>
    </section>
  );
}
