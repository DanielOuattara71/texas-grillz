/**
 * Permissions par rôle — source de vérité côté serveur.
 *
 * Le rôle et le restaurant viennent toujours de la session (req.user),
 * jamais d'un paramètre de requête ou d'un champ caché.
 *
 * Matrice :
 * - super_admin : contenu complet (y compris galerie), médias, comptes, restaurants ;
 * - admin : menu et horaires de SON restaurant + ses médias locations/<id> ;
 * - developer : rôle technique, lecture seule — aucune écriture de contenu.
 */
const SUPER = "super_admin";
const ADMIN = "admin";
const DEV = "developer";

const isSuper = (user) => user && user.role === SUPER;
const isAdmin = (user) => user && user.role === ADMIN;
const isDeveloper = (user) => user && user.role === DEV;
const isPrivileged = (user) => user && user.role === SUPER;

/** Rôle effectif pour un compte ancien sans rôle : "admin". */
const ownLocation = (user) => (user && user.location_id ? String(user.location_id) : null);

/**
 * Contenu : qui peut écrire quelle clé ?
 * - super_admin : toute clé valide (médias/galerie inclus) ;
 * - developer : aucune écriture (rôle technique, lecture seule) ;
 * - admin : uniquement <son location_id>:menu et <son location_id>:hours.
 */
function canWriteContent(user, key) {
  if (!user) return { ok: false, error: "Connexion requise." };
  const role = user.role || "admin";
  if (role === SUPER) return { ok: true };
  if (role === DEV) {
    return { ok: false, error: "Accès lecture seule (rôle technique)." };
  }
  if (role === ADMIN) {
    const loc = ownLocation(user);
    if (!loc) return { ok: false, error: "Compte non rattaché à un restaurant." };
    const idx = String(key).indexOf(":");
    const base = idx > 0 ? String(key).slice(idx + 1) : null;
    const locPart = idx > 0 ? String(key).slice(0, idx) : null;
    if (locPart === loc && (base === "menu" || base === "hours")) return { ok: true };
    return { ok: false, error: "Accès refusé à ce contenu." };
  }
  return { ok: false, error: "Rôle non autorisé." };
}

/** Réservations : super_admin filtre libre, admin forcé sur le sien, developer lecture seule. */
function reservationScope(user, requestedLocation) {
  const role = (user && user.role) || "admin";
  if (role === SUPER) return { ok: true, location: requestedLocation || null };
  if (role === ADMIN) {
    const loc = ownLocation(user);
    if (!loc) return { ok: false, error: "Compte non rattaché à un restaurant." };
    return { ok: true, location: loc };
  }
  if (role === DEV) {
    return { ok: true, location: requestedLocation || ownLocation(user) || null, readOnly: true };
  }
  return { ok: false, error: "Rôle non autorisé." };
}

/** Extrait le dossier effectif d'une URL Cloudinary ou /uploads/… ou d'un nom de dossier. */
function extractFolder(value) {
  let text = String(value || "");
  // URL Cloudinary : .../upload/v123/texas-grillz/locations/zone-4/xxx → locations/zone-4
  const cloud = text.match(/\/upload\/(?:v\d+\/)?(.+)$/i);
  if (cloud) text = cloud[1];
  if (text.startsWith("texas-grillz/")) text = text.slice("texas-grillz/".length);
  if (text.startsWith("/uploads/")) text = text.slice("/uploads/".length);
  text = text.replace(/^\/+/, "");
  const parts = text.split("/").filter(Boolean);
  if (parts.length === 0) return "";
  if (parts[0] === "locations" && parts[1]) return `locations/${parts[1]}`;
  return parts[0];
}

/** Médias : super_admin tout (dont `gallery`), developer lecture seule, admin uniquement `locations/<id>`. */
function canAccessMedia(user, folderOrUrl, action) {
  // action : "read" | "write"
  const role = (user && user.role) || "admin";
  const folder = extractFolder(folderOrUrl);
  if (role === SUPER) return { ok: true };
  if (role === DEV) {
    if (action === "read") return { ok: true };
    return { ok: false, error: "Accès lecture seule." };
  }
  if (role === ADMIN) {
    const loc = ownLocation(user);
    if (!loc) return { ok: false, error: "Compte non rattaché à un restaurant." };
    const allowed = `locations/${loc}`;
    if (folder === allowed) return { ok: true };
    return { ok: false, error: "Dossier réservé à son restaurant." };
  }
  return { ok: false, error: "Rôle non autorisé." };
}

module.exports = {
  SUPER,
  ADMIN,
  DEV,
  isSuper,
  isAdmin,
  isDeveloper,
  isPrivileged,
  ownLocation,
  canWriteContent,
  reservationScope,
  canAccessMedia,
};
