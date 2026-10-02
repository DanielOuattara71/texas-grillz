/**
 * Client HTTP de l'administration.
 *
 * Toutes les requetes partent avec `credentials: "include"` : le cookie de
 * session est ainsi envoye, et le serveur repond 401 des qu'il expire. On ne
 * stocke aucun jeton dans le JavaScript — c'est tout l'interet de `httpOnly`.
 */
import { API_BASE } from "./config";

export interface AdminUser {
  id: number;
  email: string;
  name: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    // Panne reseau : le message franc evite de croire a un mot de passe faux.
    throw new ApiError("Serveur injoignable. Verifiez la connexion.", 0);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Erreur ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export const api = {
  /* ── Session ──────────────────────────────────────────────────────────── */

  login: (email: string, password: string) =>
    request<{ user: AdminUser }>("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<void>("/api/logout", { method: "POST" }),

  me: () => request<{ user: AdminUser }>("/api/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>("/api/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  /* ── Contenu ──────────────────────────────────────────────────────────── */

  content: () => request<Record<string, { payload: unknown; updatedAt: string }>>(
    "/api/admin/content"
  ),

  saveContent: (key: string, payload: unknown) =>
    request<{ key: string; updatedAt: string }>(`/api/admin/content/${key}`, {
      method: "PUT",
      body: JSON.stringify({ payload }),
    }),

  /* ── Reservations ─────────────────────────────────────────────────────── */

  reservations: (params: { status?: string; q?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.q) query.set("q", params.q);
    if (params.limit) query.set("limit", String(params.limit));
    if (params.offset) query.set("offset", String(params.offset));
    const suffix = query.toString() ? `?${query}` : "";
    return request<{
      rows: Reservation[];
      total: number;
      byStatus: Record<string, number>;
      limit: number;
      offset: number;
    }>(`/api/admin/reservations${suffix}`);
  },

  setReservationStatus: (id: number, status: string) =>
    request<{ id: number; status: string }>(`/api/admin/reservations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  /** URL d'export CSV : passe par un lien, le cookie de session suit. */
  reservationsCsvUrl: (params: { status?: string; q?: string }) => {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.q) query.set("q", params.q);
    const suffix = query.toString() ? `?${query}` : "";
    return `${API_BASE}/api/admin/reservations.csv${suffix}`;
  },

  /* ── Medias ───────────────────────────────────────────────────────────── */

  media: () =>
    request<{
      files: MediaFile[];
      maxBytes: number;
      folders: string[];
    }>("/api/admin/media"),

  /**
   * Envoi d'une image. `FormData` est envoye tel quel : mettre un
   * `Content-Type` explicite casserait la frontiere multipart.
   */
  uploadMedia: (folder: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ url: string; name: string; bytes: number }>(
      `/api/admin/media/${folder}`,
      { method: "POST", body: form }
    );
  },

  deleteMedia: (url: string) =>
    request<void>(`/api/admin/media?url=${encodeURIComponent(url)}`, {
      method: "DELETE",
    }),
};

export interface MediaFile {
  folder: string;
  name: string;
  url: string;
  bytes: number;
  modifiedAt: string;
}

export interface Reservation {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  date: string;
  guests: string;
  message: string | null;
  status: string;
  created_at: string;
}
