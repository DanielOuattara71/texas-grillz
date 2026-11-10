import { useState, type FormEvent } from "react";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Reveal } from "../ui/Reveal";
import { Button } from "../ui/Button";
import { AvailabilityPill } from "../ui/AvailabilityPill";
import { useAvailability } from "../../hooks/useAvailability";
import { isApiConfigured, sendReservation } from "../../admin/config";
import { useContent } from "../../content/store";
import { telHref } from "../../utils/phone";

interface FormData {
  name: string;
  email: string;
  phone: string;
  locationId: string;
  date: string;
  time: string;
  guests: string;
  message: string;
}

const initialData: FormData = {
  name: "",
  email: "",
  phone: "",
  locationId: "",
  date: "",
  time: "",
  guests: "2",
  message: "",
};

/** Créneaux d'arrivée : 12h00 → 23h30, pas de 30 minutes. */
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = 12 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${minute}`;
});

/** Numéro à composer quand l'API est absente : vient du contenu, jamais en dur. */

export function ContactForm() {
  const [formData, setFormData] = useState<FormData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Recalculée chaque minute : la pastille reste exacte si l'onglet reste ouvert.
  const availability = useAvailability();
  // Le numéro affiché suit la source de vérité (admin), comme le reste du site.
  const { phone, texts, locations } = useContent();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await sendReservation(formData);

    setIsSubmitting(false);

    if (result.ok) {
      setIsSubmitted(true);
      setFormData(initialData);
      return;
    }

    // Pas de message de succes trompeur : le visiteur sait que sa demande
    // n'est pas arrivee, et il a le telephone sous les yeux.
    setError(result.error);
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
                {texts.contact.successNote}
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
          number={texts.contact.number}
          label={texts.contact.label}
          title={texts.contact.title}
          accent={texts.contact.accent}
          subtitle={texts.contact.subtitle}
          dark
        />

        <Reveal variant="up">
          <div className="-mt-8 mb-10 flex justify-center">
            <AvailabilityPill {...availability} />
          </div>
        </Reveal>

        <Reveal variant="up">
          <form onSubmit={handleSubmit} className="card-surface-dark mx-auto max-w-2xl p-8 md:p-10">
            {!isApiConfigured && (
              <p
                role="status"
                className="mb-6 rounded-card border border-caution/40 bg-caution/10 px-4 py-3 text-sm text-caution"
              >
                {texts.contact.offlineNotice} Appelez-nous au{" "}
                <a href={telHref(phone)} className="underline underline-offset-2">
                  {phone}
                </a>{" "}
                et nous noterons votre table.
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mb-6 rounded-card border border-signal-bright/40 bg-signal-bright/10 px-4 py-3 text-sm text-signal-bright"
              >
                {error}
              </p>
            )}

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
                <label htmlFor="time" className="block text-smoke text-sm mb-2">
                  Heure souhaitée *
                </label>
                <select
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                  className="w-full rounded-card border border-gold/20 bg-cream/5 px-4 py-3 text-cream focus:border-gold focus:outline-none transition-colors"
                >
                  <option value="" disabled>
                    Choisissez une heure…
                  </option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot.replace(":", "h")}
                    </option>
                  ))}
                </select>
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
                <label htmlFor="locationId" className="block text-smoke text-sm mb-2">
                  Site souhaité *
                </label>
                <select
                  id="locationId"
                  name="locationId"
                  value={formData.locationId}
                  onChange={handleChange}
                  required
                  className="w-full rounded-card border border-gold/20 bg-cream/5 px-4 py-3 text-cream focus:border-gold focus:outline-none transition-colors"
                >
                  <option value="" disabled>
                    Choisissez un site…
                  </option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
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
