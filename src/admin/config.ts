/**
 * Envoi de la demande de reservation.
 *
 * Le formulaire visait un service qui n'existait pas : il simulait l'envoi
 * (`setTimeout`) et affichait un succes. Si `VITE_API_URL` n'est pas defini,
 * on ne peut rien envoyer — on le dit franchement plutot que de mentir au
 * visiteur. Avec l'API configuree, la demande atterrit dans l'espace
 * d'administration et le message de confirmation est vrai.
 */
const fromEnv = import.meta.env.VITE_API_URL as string | undefined;

export const API_BASE = (fromEnv ?? "").replace(/\/$/, "");

export const isApiConfigured = API_BASE.length > 0 || import.meta.env.DEV;

export interface ReservationDraft {
  name: string;
  email: string;
  phone: string;
  date: string;
  guests: string;
  message: string;
}

export type ReservationResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

/** Envoie une demande. Ne leve jamais : renvoie toujours un resultat exploitable. */
export async function sendReservation(
  draft: ReservationDraft
): Promise<ReservationResult> {
  try {
    const response = await fetch(`${API_BASE}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });

    if (!response.ok) {
      const text = await response.text();
      const data = text ? (JSON.parse(text) as { error?: string }) : null;
      return {
        ok: false,
        error:
          data?.error ??
          (response.status === 429
            ? "Trop de demandes envoyees. Appelez-nous au 04 78 00 00 00."
            : "Votre demande n'a pas pu etre envoyee. Appelez-nous au 04 78 00 00 00."),
      };
    }

    return { ok: true, id: (await response.json()).id as number };
  } catch {
    return {
      ok: false,
      error:
        "Serveur injoignable. Appelez-nous au 04 78 00 00 00 et nous noterons la table.",
    };
  }
}

