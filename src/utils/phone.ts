/**
 * Telephone et WhatsApp, liens normalises.
 *
 * Les numeros de Texas GrillZ sont affiches en format national
 * (« 07 77 59 59 47 ») ; les liens `tel:` et `wa.me` ont besoin
 * d'un format international sans espaces.
 */

function toInternationalDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("225")) return digits;
  if (digits.startsWith("0")) return `225${digits.slice(1)}`;
  return digits;
}

/** `telHref("07 77 59 59 47") → "tel:+2250777595947"`. */
export function telHref(phone: string): string {
  return `tel:+${toInternationalDigits(phone)}`;
}

/** `whatsappHref()` → `https://wa.me/2250777595947`, avec `?text=` si un message est fourni. */
export function whatsappHref(phone: string, message?: string): string {
  const digits = toInternationalDigits(phone);
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
