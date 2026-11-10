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
  location_id?: string | null;
  location?: string | null;
  role?: string;
  active?: number;
  must_change_password?: boolean;
  phone?: string;
  created_at?: string | null;
  last_login_at?: string | null;
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

  reservations: (params: {
    status?: string;
    q?: string;
    location?: string;
    date?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.q) query.set("q", params.q);
    if (params.location) query.set("location", params.location);
    if (params.date) query.set("date", params.date);
    if (params.date_from) query.set("date_from", params.date_from);
    if (params.date_to) query.set("date_to", params.date_to);
    if (params.limit) query.set("limit", String(params.limit));
    if (params.offset) query.set("offset", String(params.offset));
    const suffix = query.toString() ? `?${query}` : "";
    return request<{
      rows: Reservation[];
      total: number;
      byStatus: Record<string, number>;
      limit: number;
      offset: number;
      stats: { total: number; today: number; nouvelle: number; confirmee: number; annulee: number };
    }>(`/api/admin/reservations${suffix}`);
  },

  setReservationStatus: (id: number, status: string) =>
    request<{ id: number; status: string }>(`/api/admin/reservations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  /** URL d'export CSV : passe par un lien, le cookie de session suit. */
  reservationsCsvUrl: (params: {
    status?: string;
    q?: string;
    location?: string;
    date?: string;
    date_from?: string;
    date_to?: string;
  }) => {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.q) query.set("q", params.q);
    if (params.location) query.set("location", params.location);
    if (params.date) query.set("date", params.date);
    if (params.date_from) query.set("date_from", params.date_from);
    if (params.date_to) query.set("date_to", params.date_to);
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

  deleteLocationContent: (locationId: string) =>
    request<void>(`/api/admin/locations/${locationId}/content`, {
      method: "DELETE",
    }),

  /* ── Équipe (super_admin) ─────────────────────────────────────────────── */

  users: () => request<{ users: AdminUser[] }>("/api/admin/users"),
  createUser: (input: { email: string; name: string; role: string; location_id?: string | null; phone?: string }) =>
    request<{ user: AdminUser; temporaryPassword: string }>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateUser: (id: number, patch: Record<string, unknown>) =>
    request<{ user: AdminUser }>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteUser: (id: number) =>
    request<void>(`/api/admin/users/${id}`, { method: "DELETE" }),
  resetUserPassword: (id: number) =>
    request<{ temporaryPassword: string }>(`/api/admin/users/${id}/reset-password`, {
      method: "POST",
    }),

  adminCategories: (params?: { location?: string }) =>
    request<{ categories: CategoryRecord[] }>(`/api/admin/categories${params?.location ? `?location=${encodeURIComponent(params.location)}` : ""}`),
  mediaUsage: (url: string) =>
    request<{ url: string; refs: { surface: string; id: string; label: string }[] }>(
      `/api/admin/media/usage?url=${encodeURIComponent(url)}`
    ),
  publicCategories: (params?: { location?: string }) =>
    request<{ categories: CategoryRecord[] }>(`/api/categories${params?.location ? `?location=${encodeURIComponent(params.location)}` : ""}`),
  createCategory: (input: CategoryRecord) =>
    request<{ category: CategoryRecord }>("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateCategory: (locationId: string, id: string, patch: Record<string, unknown>) =>
    request<{ category: CategoryRecord }>(
      `/api/admin/categories/${encodeURIComponent(locationId)}/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(patch) }
    ),
  deleteCategory: (locationId: string, id: string) =>
    request<void>(`/api/admin/categories/${encodeURIComponent(locationId)}/${encodeURIComponent(id)}`, { method: "DELETE" }),

  /* ── Restaurants (table restaurants, source de vérité) ─────────────────── */

  adminRestaurants: () => request<{ restaurants: AdminRestaurantRecord[] }>("/api/admin/restaurants"),
  createRestaurant: (input: RestaurantCreateInput) =>
    request<{ restaurant: AdminRestaurantRecord; temporaryPassword: string }>("/api/admin/restaurants", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateRestaurant: (id: string, patch: Record<string, unknown>) =>
    request<{ restaurant: AdminRestaurantRecord }>(`/api/admin/restaurants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteRestaurant: (id: string) =>
    request<void>(`/api/admin/restaurants/${id}`, { method: "DELETE" }),

  /* ── Restaurants (bloc content `locations`, historique) ─────────────────── */

  locations: () => request<{ locations: LocationRecord[] }>("/api/admin/locations"),
  createLocation: (input: LocationRecord) =>
    request<{ location: LocationRecord }>("/api/admin/locations", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateLocation: (id: string, patch: Record<string, unknown>) =>
    request<{ location: LocationRecord }>(`/api/admin/locations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteLocation: (id: string) =>
    request<void>(`/api/admin/locations/${id}`, { method: "DELETE" }),

  plats: (params?: { location?: string }) => {
    const suffix = params?.location ? `?location=${encodeURIComponent(params.location)}` : "";
    return request<{ plats: PlatRecord[] }>(`/api/admin/plats${suffix}`);
  },
  createPlat: (input: PlatRecord) =>
    request<{ plat: PlatRecord }>("/api/admin/plats", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updatePlat: (id: string, patch: Record<string, unknown>) =>
    request<{ plat: PlatRecord }>(`/api/admin/plats/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deletePlat: (id: string) =>
    request<void>(`/api/admin/plats/${id}`, { method: "DELETE" }),

  audit: (params?: { q?: string; location?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.location) query.set("location", params.location);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const suffix = query.toString() ? `?${query}` : "";
    return request<{ rows: AuditRow[]; limit: number; offset: number }>(
      `/api/admin/audit${suffix}`
    );
  },
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
  /** Heure souhaitée (HH:MM) — vide pour les réservations antérieures. */
  time?: string;
  guests: string;
  message: string | null;
  status: string;
  created_at: string;
  location_id?: string | null;
}

export interface CategoryRecord {
  id: string;
  locationId: string | null;
  label: string;
  note: string;
  sort: number;
  active: boolean;
  createdAt?: string | null;
}

export interface AdminRestaurantAdmin {
  id: number;
  email: string;
  name: string;
  phone: string;
  active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
}

export interface AdminRestaurantRecord {
  id: string;
  name: string;
  description: string;
  email: string;
  address: string;
  phone: string;
  image: string;
  mapsUrl?: string;
  active?: boolean;
  published?: boolean;
  created_at?: string | null;
  admin?: AdminRestaurantAdmin | null;
}

export interface RestaurantCreateInput {
  id: string;
  name: string;
  description?: string;
  email?: string;
  address: string;
  phone: string;
  image: string;
  mapsUrl?: string;
  active?: boolean;
  published?: boolean;
  admin: { name: string; email?: string; phone?: string };
}

export interface ApiRestaurant {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  image: string;
  mapsUrl: string;
  active: boolean;
  published: boolean;
}

/** Restos table `restaurants`, convertis pour useContent (injection dans le provider). */
export const restaurantsToContent = (rows: ApiRestaurant[]): import("../data/locations").Location[] =>
  rows
    .filter((r) => r.active !== false && r.published !== false)
    .map((r, i) => ({
      id: r.id,
      number: String(i + 1).padStart(2, "0"),
      name: r.name,
      address: r.address,
      phone: r.phone,
      image: r.image || "",
      mapsUrl: r.mapsUrl || "",
      active: true,
      published: r.published !== false,
    }));

export interface LocationRecord {
  id: string;
  number?: string;
  name: string;
  address: string;
  phone: string;
  image: string;
  mapsUrl?: string;
  active?: boolean;
  schedule?: { open: string | null; close: string | null }[];
}

export interface PlatRecord {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  priceFrom?: boolean;
  image: string;
  locationId?: string;
  restaurantId?: string;
}

export interface AuditRow {
  id: number;
  user_id: number | null;
  action: string;
  key: string | null;
  location_id: string | null;
  summary: string | null;
  at: string;
}
