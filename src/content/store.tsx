/**
 * Contenu du site, charge depuis l'API.
 *
 * Le site lit normalement ses donnees dans `src/data/*.ts`. Depuis
 * l'espace d'administration, ces memes donnees sont modifiables en ligne : on
 * les lit donc au demarrage via `GET /api/content`, bloc par bloc.
 *
 * Regle absolue : le site ne doit jamais dependre de la disponibilite du
 * backend. Si l'appel echoue (API eteinte, hors ligne, premier demarrage),
 * on garde silencieusement les donnees livrees avec le depot. Le visiteur voit
 * toujours un site complet ; seule l'administration demande le backend.
 *
 * `cravings` est un cas a part : chaque entree reference un plat par son `id`
 * et herite de son nom et de son prix. Si un plat est supprime, l'envie qui
 * pointait dessus est ecartee plutot que de faire echouer le rendu.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { API_BASE } from "../admin/config";
import { menuItems as deliveredMenu, type MenuItem } from "../data/menu";
import { cravings as deliveredCravings, type Craving } from "../data/cravings";
import { locations as deliveredLocations, type Location } from "../data/locations";
import { services as deliveredServices, type Service } from "../data/services";
import {
  testimonials as deliveredTestimonials,
  type Testimonial,
} from "../data/testimonials";
import { site as deliveredSite, proofs, navLinks, type Proof } from "../data/site";
import { standardSchedule, type DayService } from "../data/hours";
import {
  fixedVisuals as deliveredVisuals,
  galleryVisuals as deliveredGallery,
  type Visual,
} from "../data/visuals";
import { siteTexts, historyTexts, type SiteTexts, type HistoryTexts } from "../data/texts";
import { formatHourGroups } from "../utils/availability";
import { categories as deliveredCategories } from "../utils/menu";

/**
 * Fusionne un bloc de textes recu par l'API sur les textes livres.
 *
 * Deux gardes. D'abord, un bloc qui n'est pas un objet (l'API a repondu
 * `null`, une chaine, un tableau) est ignore : la fusion ci-dessous le
 * renverrait tel quel et `texts.hero` deviendrait `undefined`, ce qui casse
 * tous les composants. Ensuite, la fusion est faite cle par cle, pour qu'un
 * enregistrement partiel n'efface pas les sections non concernees.
 */
function mergeTexts<T extends object>(base: T, patch: unknown): T {
  return isPlainObject(patch) ? deepMerge(base, patch) : base;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Fusion profonde, utilisee par `mergeTexts`.
 *
 * L'admin ne renvoie que les champs modifies, et on ne veut pas qu'un
 * sous-objet partiel (`{ title: "…" }`) remplace tout l'en-tete de section en
 * vidant son accent et son sous-titre. Les tableaux sont remplaces (ils sont
 * modifies entiers), les objets fusionnes cle par cle.
 */
function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === undefined || patch === null) return base;
  if (Array.isArray(patch)) return patch as T;
  if (typeof patch !== "object") return patch as T;
  if (typeof base !== "object" || base === null || Array.isArray(base)) {
    return patch as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    out[key] = deepMerge(
      (base as Record<string, unknown>)[key],
      value
    );
  }
  return out as T;
}

export interface Content {
  menu: MenuItem[];
  /** Tuiles d'envie, resoutes sur `menu`. */
  cravings: Craving[];
  /** Cartes par restaurant (`<id>:menu`), validées avant usage. */
  menuByLocation: Record<string, MenuItem[]>;
  /** Catégories de carte par restaurant (livrées depuis le backend). */
  categoriesByLocation: Record<string, { id: string; label: string; note: string; sort: number }[]>;
  /** Horaires par restaurant (`<id>:hours`), validés avant usage. */
  hoursByLocation: Record<string, DayService[]>;
  locations: Location[];
  services: Service[];
  testimonials: Testimonial[];
  proofs: Proof[];
  /** Horaires de la maison (7 jours). */
  hours: DayService[];
  /** Horaires resolus par adresse : chaque identifiant a ses 7 jours. */
  locationHours: Record<string, DayService[]>;
  address: string;
  phone: string;
  email: string;
  tagline: string;
  established: number;
  tonight: string[];
  rating: { score: number; reviews: number; url: string } | undefined;
  social: Record<string, string>;
  navLinks: { label: string; href: string }[];
  /** Emplacements visuels uniques (hero, logo, page Histoire…), par identifiant. */
  visuals: Record<string, Visual>;
  /** Galerie : liste ordonnée de visuels, photos et boucles mélangées. */
  gallery: Visual[];
  /** Textes des sections, modifiables depuis l'admin. */
  texts: SiteTexts;
  /** Textes de la page Histoire. */
  historyTexts: HistoryTexts;
  /** Vrai si le contenu vient de l'API (faux = donnees livrees). */
  fromApi: boolean;
}

const sevenDays = (value: unknown): DayService[] | null => {
  if (!Array.isArray(value) || value.length !== 7) return null;
  return value.map((day) => {
    const entry = (day ?? {}) as { open?: string | null; close?: string | null };
    return {
      open: typeof entry.open === "string" ? entry.open : null,
      close: typeof entry.close === "string" ? entry.close : null,
    };
  });
};

/** Un tableau d'objets : la forme attendue pour la carte, les sites, les avis… */
const rows = <T,>(value: unknown, minimum = 0): T[] | null => {
  if (!Array.isArray(value) || value.length < minimum) return null;
  return value.every((entry) => typeof entry === "object" && entry !== null)
    ? (value as T[])
    : null;
};

/** Un objet simple : coordonnees, note, tonight… */
const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const readString = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

export const defaultContent = (): Content => ({
  menu: deliveredMenu,
  cravings: deliveredCravings,
  menuByLocation: Object.fromEntries(
    deliveredLocations.map((location) => [location.id, [...deliveredMenu]])
  ),
  categoriesByLocation: Object.fromEntries(
    deliveredLocations.map((location) => [
      location.id,
      deliveredCategories.map((c, index) => ({ id: c.id, label: c.label, note: c.note || "", sort: index + 1 })),
    ])
  ),
  hoursByLocation: Object.fromEntries(
    deliveredLocations.map((location) => [
      location.id,
      location.schedule ?? standardSchedule,
    ])
  ),
  locations: deliveredLocations,
  services: deliveredServices,
  testimonials: deliveredTestimonials,
  proofs,
  hours: standardSchedule,
  locationHours: Object.fromEntries(
    deliveredLocations.map((location) => [
      location.id,
      location.schedule ?? standardSchedule,
    ])
  ),
  address: deliveredSite.address,
  phone: deliveredSite.phone,
  email: deliveredSite.email,
  tagline: deliveredSite.tagline,
  established: deliveredSite.established,
  tonight: deliveredSite.tonight,
  rating: deliveredSite.rating,
  social: deliveredSite.social,
  navLinks,
  visuals: Object.fromEntries(deliveredVisuals.map((v) => [v.id, v])),
  gallery: deliveredGallery,
  texts: siteTexts,
  historyTexts,
  fromApi: false,
});

/**
 * Fusionne la reponse de l'API sur les valeurs livrees, bloc par bloc.
 *
 * Le parametre peut valoir n'importe quoi (`null`, un tableau, une chaine) :
 * l'appelant n'a pas a valider la reponse avant de la passer ici.
 */
export function mergeContent(payload: unknown): Content {
  const blocks = record(payload) ?? {};
  const base = defaultContent();

  const menu = rows<MenuItem>(blocks.menu) ?? base.menu;
  const locations = rows<Location>(blocks.locations) ?? base.locations;
  const site = record(blocks.site) ?? {};

  // Un site edite peut porter un `schedule` : on le recycle pour ses horaires.
  const hours = sevenDays(site.schedule) ?? sevenDays(blocks.hours) ?? base.hours;

  // Horaires par adresse : `locationHours[id]`, sinon le `schedule` porte par
  // l'adresse elle-meme, sinon les horaires de la maison.
  const locationHours: Record<string, DayService[]> = {};
  const edited = record(blocks.locationHours) ?? {};
  for (const location of locations) {
    const own = sevenDays((location as { schedule?: unknown }).schedule);
    locationHours[location.id] = sevenDays(edited[location.id]) ?? own ?? hours;
  }

  // Contenu par restaurant : `byLocation` (cartes + horaires), validé avant usage.
  // Repli sur `defaultContent` (copie livrée par restaurant) pour que la
  // provenance reste explicite même sans backend.
  const menuByLocation: Record<string, MenuItem[]> = { ...base.menuByLocation };
  const hoursByLocation: Record<string, DayService[]> = { ...base.hoursByLocation };
  const byLoc = record(blocks.byLocation) ?? {};
  const byLocEdited = record(blocks.byLocation) ?? {};
  // Accepte aussi l'ancienne forme `locationHours` explicite ci-dessus
  // et les blocs "<id>:menu" / "<id>:hours" étalés à la racine.
  const rawByLocation: Record<string, unknown> = {
    ...(typeof byLoc === "object" && byLoc !== null ? (byLoc as Record<string, unknown>) : {}),
  };
  for (const [key, value] of Object.entries(blocks)) {
    const idx = key.indexOf(":");
    if (idx <= 0) continue;
    const locId = key.slice(0, idx);
    const baseKey = key.slice(idx + 1);
    if (baseKey !== "menu" && baseKey !== "hours") continue;
    const prev = record(rawByLocation[locId]) ?? {};
    rawByLocation[locId] = { ...prev, [baseKey]: value };
  }
  for (const location of locations) {
    const entry = record(rawByLocation[location.id]) ?? record(byLocEdited[location.id]) ?? {};
    const seatMenu = rows<MenuItem>(entry.menu, 1) ?? (entry.menu !== undefined ? rows<MenuItem>(entry.menu) : null);
    if (Array.isArray(entry.menu) && (entry.menu as unknown[]).every((e) => typeof e === "object" && e !== null)) {
      menuByLocation[location.id] = entry.menu as MenuItem[];
    }
    void seatMenu;
    const seatHours = sevenDays(entry.hours);
    if (seatHours) hoursByLocation[location.id] = seatHours;
    else if (locationHours[location.id]) hoursByLocation[location.id] = locationHours[location.id];
  }
  // Ne montrer que les restaurants actifs et visibles.
  const activeLocations = locations.filter(
    (l) =>
      l.active !== false &&
      (l as { status?: string }).status !== "bientot" &&
      (l as { published?: boolean }).published !== false
  );

  // Les envies referencent la carte par id : on les resout sur la carte
  // reellement affichee, jamais sur le fichier livre. Un plat supprime ecarte
  // l'envie qui pointait dessus, sans faire echouer le rendu.
  const byId = new Map(menu.map((item) => [item.id, item]));
  type CravingRow = Partial<Omit<Craving, "item">> & { menuId?: string };
  const rawCravings = rows<CravingRow>(blocks.cravings, 0);

  /**
   * Les envies referencent la carte par `id`. On les resout donc TOUJOURS sur
   * la carte reellement affichee — meme quand le bloc `cravings` est absent de
   * la reponse : sans cela, une envie garderait l'ancien prix d'un plat alors
   * que la carte, elle, vient de l'API. Un plat supprime ecarte l'envie qui
   * pointait dessus, sans faire echouer le rendu.
   */
  const sourceCravings: CravingRow[] = rawCravings ?? deliveredCravings.map((craving) => ({
    id: craving.id,
    menuId: craving.item.id,
    kicker: craving.kicker,
    hook: craving.hook,
    stamp: craving.stamp,
    video: craving.video,
    featured: craving.featured,
  }));

  const resolved: Craving[] = [];
  for (const entry of sourceCravings) {
    const itemId = entry.menuId ?? entry.id;
    const item = itemId ? byId.get(itemId) : undefined;
    if (!item) continue;
    const source = deliveredCravings.find(
      (delivered) => delivered.id === (entry.id ?? itemId)
    );
    resolved.push({
      id: entry.id ?? itemId ?? item.id,
      kicker: readString(entry.kicker, source?.kicker ?? ""),
      hook: readString(entry.hook, source?.hook ?? item.description),
      stamp: entry.stamp ? String(entry.stamp) : undefined,
      video: entry.video ? String(entry.video) : source?.video,
      featured: Boolean(entry.featured),
      item,
    });
  }
  const cravings: Craving[] = resolved;

  const rating = record(site.rating) ?? {};
  const social = record(site.social);

  /**
    * Emplacements visuels uniques : l'admin ne renvoie que ce qu'il a modifie
   * (source, texte alternatif), on fusionne donc sur la fiche livree. Sans ce
   * fusion, un `{ id, src }` sans libelle laisserait un emplacement orphelin
   * dans l'admin, et le composant afficherait un nom vide.
   */
  const visuals: Record<string, Visual> = { ...base.visuals };
  for (const entry of rows<Partial<Visual> & { id?: string }>(blocks.visuals, 0) ?? []) {
    // Emplacement inconnu : ignore. Le contenu enregistre peut dater d'une
    // version anterieure du site, qui ne connaisait pas cet emplacement.
    if (!entry.id || !(entry.id in visuals)) continue;
    visuals[entry.id] = { ...visuals[entry.id], ...entry, id: entry.id };
  }

  /**
   * Galerie : liste ordonnee, donc remplacee entierement. On exige.type et
   * `src`, sans quoi une vignette casserait la section (FoodMedia attend l'un
   * ou l'autre). Le `ratio` est conserve s'il est fourni.
   */
  const editedGallery = rows<Visual>(blocks.gallery, 0);
  const gallery: Visual[] = editedGallery
    ? editedGallery.filter(
        (entry) =>
          Boolean(entry.id) &&
          (entry.type === "image" || entry.type === "video") &&
          Boolean(entry.src)
      )
    : base.gallery;

  return {
    menu,
    cravings,
    menuByLocation,
    hoursByLocation,
    categoriesByLocation: base.categoriesByLocation,
    locations: activeLocations,
    services: rows<Service>(blocks.services) ?? base.services,
    testimonials: rows<Testimonial>(blocks.testimonials) ?? base.testimonials,
    proofs: rows<Proof>(blocks.proofs) ?? base.proofs,
    hours,
    locationHours,
    address: readString(site.address, base.address),
    phone: readString(site.phone, base.phone),
    email: readString(site.email, base.email),
    tagline: readString(site.tagline, base.tagline),
    established: readNumber(site.established, base.established),
    tonight: Array.isArray(site.tonight)
      ? site.tonight.map(String)
      : base.tonight,
    rating: base.rating
      ? {
          score: readNumber(rating.score, base.rating.score),
          reviews: readNumber(rating.reviews, base.rating.reviews),
          url: readString(rating.url, base.rating.url),
        }
      : undefined,
    social: social
      ? Object.fromEntries(
          Object.entries(social).map(([key, value]) => [key, String(value)])
        )
      : base.social,
    navLinks: rows<{ label: string; href: string }>(blocks.navLinks) ?? base.navLinks,
    visuals,
    gallery,
    texts: mergeTexts(base.texts, blocks.texts),
    historyTexts: mergeTexts(base.historyTexts, blocks.historyTexts),
    fromApi: true,
  };
}

/**
 * Le contexte vaut `null` tant qu'aucun `ContentProvider` n'est monte.
 *
 * Volontairement : une valeur par defaut aurait masque le provider manquant
 * en renvoyant les donnees livrees, et l'admin aurait alors enregistre par
 * dessus les modifications faites depuis l'API. Une page qui appelle
 * `useContent()` hors provider doit echouer bruyamment, comme `useSession`.
 */
const ContentContext = createContext<Content | null>(null);

/**
 * Charge le contenu une fois au demarrage. L'echec est silencieux : le site
 * reste entierement fonctionnel avec les donnees livrees.
 */
export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<Content>(defaultContent);

  useEffect(() => {
    let alive = true;

    fetch(`${API_BASE}/api/content`, { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: Record<string, unknown> | null) => {
        if (alive && payload && Object.keys(payload).length > 0) {
          setContent(mergeContent(payload));
        }
      })
      .catch(() => {
        // API indisponible : le visiteur garde le contenu du depot.
      });

    // Restaurants actifs depuis la table `restaurants` (source de vérité).
    fetch(`${API_BASE}/api/restaurants`, { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { restaurants?: unknown[] } | null) => {
        if (!alive || !payload || !Array.isArray(payload.restaurants)) return;
        const rows = payload.restaurants as Record<string, unknown>[];
        if (rows.length === 0) return;
        setContent((current) => {
          const next: Location[] = rows
            .filter((r) => r.active !== false && r.published !== false)
            .map((r, index) => ({
              id: String(r.id ?? ""),
              number: String(index + 1).padStart(2, "0"),
              name: String(r.name ?? ""),
              address: String(r.address ?? ""),
              phone: String(r.phone ?? ""),
              image: String(r.image ?? ""),
              mapsUrl: String(r.mapsUrl ?? r.maps_url ?? ""),
              active: true,
              published: (r as { published?: boolean }).published !== false,
            }));
          return { ...current, locations: next, fromApi: true };
        });
      })
      .catch(() => {
        // Repli bloc/`locations livrées`.
      });

    // Catégories par restaurant (table categories, source de vérité).
    fetch(`${API_BASE}/api/categories`, { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { categories?: unknown[] } | null) => {
        if (!alive || !payload || !Array.isArray(payload.categories)) return;
        setContent((current) => {
          const byRestaurant: Record<string, { id: string; label: string; note: string; sort: number }[]> = {};
          for (const raw of payload.categories as Record<string, unknown>[]) {
            const r = raw as Record<string, unknown>;
            const rid = String(r.locationId ?? "");
            if (!rid) continue;
            const item = {
              id: String(r.id ?? ""),
              label: String(r.label ?? r.id ?? ""),
              note: String(r.note ?? ""),
              sort: Number(r.sort) || 0,
            };
            (byRestaurant[rid] = byRestaurant[rid] ?? []).push(item);
          }
          for (const key of Object.keys(byRestaurant)) {
            byRestaurant[key].sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label));
          }
          // Sans table pour un restaurant, on garde le repli livré.
          const merged = { ...current.categoriesByLocation, ...byRestaurant };
          return { ...current, categoriesByLocation: merged };
        });
      })
      .catch(() => {
        // Repli : les catégories livrées restent.
      });

    // Entités Plat (tables) : remplace intégralement les cartes par restaurant.
    fetch(`${API_BASE}/api/plats`, { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { plats?: unknown[] } | null) => {
        if (!alive || !payload || !Array.isArray(payload.plats)) return;
        setContent((current) => {
          const byLocation: Record<string, MenuItem[]> = {};
          for (const raw of payload.plats as Record<string, unknown>[]) {
            const r = raw as Record<string, unknown>;
            const rid = String(r.locationId ?? r.restaurantId ?? "");
            if (!rid) continue;
            const price = Number(r.price ?? 0);
            const priceFrom = Boolean(r.priceFrom);
            const id = String(r.id ?? "");
            const item: MenuItem = {
              id,
              name: String(r.name ?? ""),
              description: String(r.description ?? ""),
              price: Number.isFinite(price) ? price : 0,
              category: String(r.category ?? "bbq") as MenuItem["category"],
              priceFrom,
              locationIds: [rid],
              locationId: rid,
              image: String(r.image ?? ""),
            };
            (byLocation[rid] = byLocation[rid] ?? []).push(item);
          }
          // Sans table peuplée pour un restaurant, on garde le repli livré.
          const merged = { ...current.menuByLocation, ...byLocation };
          return { ...current, menuByLocation: merged, fromApi: current.fromApi || Object.keys(byLocation).length > 0 };
        });
      })
      .catch(() => {
        // Repli : les plats de `byLocation`/`src/data` restent.
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <ContentContext.Provider value={content}>{children}</ContentContext.Provider>
  );
}

export function useContent(): Content {
  const value = useContext(ContentContext);
  if (!value) throw new Error("useContent doit etre utilise dans <ContentProvider>.");
  return value;
}

/** Lignes d'horaire affichees, derivees des horaires de la maison. */
export function useHourLines() {
  const { hours } = useContent();
  return useMemo(() => formatHourGroups(hours), [hours]);
}

