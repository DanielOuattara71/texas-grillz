/**
 * Depot et liste des images, pour l'espace d'administration.
 *
 * Le site public sert ses images depuis `public/images`. En developpement, on
 * ecrit directement dans ce dossier. En production, `public/` fait partie du
 * build : ecrire dedans ne survivrait pas a un redéploiement. On bascule donc
 * sur un dossier de medias distinct, monte en volume persistant, servi par
 * `/uploads` (voir `index.js`).
 *
 * Regles de securite appliquees a chaque fichier envoye :
 *   - type MIME image verifie par les octets du fichier, pas par l'extension ;
 *   - extension reditee a partir du type, jamais prise dans le nom fourni ;
 *   - nom de fichier regenere : le nom client ne touche jamais le disque
 *     (evite la traversee de repertoire et l'ecrasement d'un fichier existant) ;
 *   - taille limitee par multer, et contenu relu avant d'etre accepte.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const multer = require("multer");
const { requireAuth } = require("./routes-auth");
const { db } = require("./db");
const cloudinary = require("./cloudinary");
const fsForMedia = fs;

/**
 * Retire les references a une photo supprimee dans les blocs de contenu.
 *
 * Regle de gestion : une URL de media ne doit jamais survivre a son fichier.
 * Sans cette passe, un visuel supprime resterait referent dans le JSON stocke
 * (menu, visuals, gallery…), et le bloc continuerait apres redemarrage avec un
 * visuel qui n'existe plus — le fallback d'affichage masquait l'incoherence.
 */
function stripRefs(value, url) {
  if (typeof value === "string") return value === url ? null : value;
  if (Array.isArray(value)) {
    const out = [];
    for (const entry of value) {
      const cleaned = stripRefs(entry, url);
      if (cleaned !== null) out.push(cleaned);
    }
    return out;
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, entry] of Object.entries(value)) {
      const cleaned = stripRefs(entry, url);
      if (cleaned === null) continue;
      out[key] = cleaned;
    }
    return out;
  }
  return value;
}

/** Scrub toutes les occurrences de l'URL dans tous les blocs de contenu. */
/** Usages d'une URL : qui réfère cette image, dans quel contexte public. */
function mediaUsage(url) {
  const refs = [];
  const visualLabel = db.prepare("SELECT payload FROM content WHERE key = ?");
  for (const key of ["visuals"].concat(db.prepare("SELECT DISTINCT key FROM content WHERE key LIKE '%:visuals'").all().map((r) => r.key))) {
    try {
      const obj = JSON.parse(visualLabel.get(key)?.payload || "{}");
      for (const [id, v] of Object.entries(obj || {})) {
        if (v && String(v.src || "") === url) refs.push({ surface: key.includes(":") ? `visuel ${key.split(":")[0]}` : "visuel", id, label: String(v.label || id) });
      }
    } catch { /* bloc illisible : indisponible, pas d'usage déclaré */ }
  }
  for (const key of ["gallery"].concat(db.prepare("SELECT DISTINCT key FROM content WHERE key LIKE '%:gallery'").all().map((r) => r.key))) {
    try {
      const list = JSON.parse(visualLabel.get(key)?.payload || "[]");
      if (Array.isArray(list)) {
        list.forEach((item, index) => {
          if (item && String(item.src || "") === url) {
            refs.push({ surface: key.includes(":") ? `galerie ${key.split(":")[0]}` : "galerie", id: String(item.id || `vignette-${index + 1}`), label: String(item.alt || item.label || `Vignette ${index + 1}`) });
          }
        });
      }
    } catch { /* bloc illisible */ }
  }
  for (const row of db.prepare("SELECT id, name FROM restaurants WHERE image = ?").all(url)) {
    refs.push({ surface: "restaurants", id: row.id, label: row.name });
  }
  for (const row of db.prepare("SELECT id, name FROM plats WHERE image = ?").all(url)) {
    refs.push({ surface: "plat (restaurant)", id: row.id, label: `${row.name} — géré par le restaurant, lecture seule` });
  }
  return refs;
}

function scrubReferences(url) {
  const rows = db.prepare("SELECT key, payload FROM content").all();
  const update = db.prepare(
    "UPDATE content SET payload = ?, updated_at = datetime('now') WHERE key = ?"
  );
  for (const row of rows) {
    let payload;
    try {
      payload = JSON.parse(row.payload);
    } catch {
      continue; // JSON corrompu : on ne touche pas a un bloc illisible
    }
    const cleaned = stripRefs(payload, url);
    const next = JSON.stringify(cleaned);
    if (next !== JSON.stringify(payload)) update.run(next, row.key);
  }
}

const router = express.Router();

/** Sous-dossier public : meme chemin que le site, pour ne rien changer en aval. */
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "media");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/** Prefixe servi par le serveur. */
const PUBLIC_PREFIX = "/uploads";

/** 8 Mo : largement au-dessus d'une photo de smartphone, sous le plafondutile. */
const MAX_BYTES = 8 * 1024 * 1024;

/** Types reellement acceptes, avec l'extension correspondante. */
const ALLOWED = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

/** Extensions acceptees, derivees d'ALLOWED (et non l'inverse). */
const ALLOWED_EXTENSIONS = new Set(Object.values(ALLOWED));

/** Sous-dossier cible : `products`, `gallery`, `locations`, `misc`,
 * plus `locations/<id>` (un dossier par restaurant). */
const FOLDERS = ["products", "gallery", "locations", "misc"];

/** Un nom de dossier valide : un des dossiers connus, ou `locations/<slug>`. */
function isValidFolder(folder) {
  const text = String(folder || "");
  if (FOLDERS.includes(text)) return true;
  if (/^locations\/[a-z0-9][a-z0-9-]*$/i.test(text)) return true;
  return false;
}

const slug = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/**
 * Multer interprete le nom de fichier envoye en latin1 (c'est ce que font la
 * plupart des navigateurs pour ce champ). On le redecode en UTF-8 pour que
 * « Brisket Fumé.jpg » produise bien `brisket-fume-....jpg` et non
 * `brisket-fuma-....jpg`. Le caractere de remplacement signale un nom qui
 * n'etait de toute facon pas en UTF-8 : on le tolere, le slug le neutralisera.
 */
const decodeName = (value) => {
  try {
    const decoded = Buffer.from(value, "latin1").toString("utf8");
    return decoded.includes("�") ? value : decoded;
  } catch {
    return value;
  }
};

/**
 * En mémoire quand Cloudinary est configuré (évite d'écrire sur disque),
 * sinon disque local (rétrocompatibilité/tests hors Cloudinary).
 */
const storage = cloudinary.isConfigured()
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, _file, cb) => {
        const raw =
          String(req.params.folder || "misc") +
          (req.params.subfolder ? `/${String(req.params.subfolder)}` : "");
        const safe = isValidFolder(raw) ? raw : "misc";
        const target = path.join(UPLOAD_DIR, safe);
        fs.mkdirSync(target, { recursive: true });
        cb(null, target);
      },
      filename: (_req, file, cb) => {
        const base = slug(path.parse(decodeName(file.originalname)).name) || "image";
        const extension = ALLOWED[file.mimetype] ?? ".jpg";
        const unique = crypto.randomBytes(4).toString("hex");
        cb(null, `${base}-${unique}${extension}`);
      },
    });

/**
 * Garde d'autorisation AVANT multer.
 *
 * Multer écrit le fichier sur disque dès l'arrivée de la requête ; si la
 * permission était vérifiée seulement après, un envoi refusé laisserait
 * quand même le fichier sur le disque. On valide donc le dossier cible
 * (existence + droit d'écriture) avant que le moindre octet ne soit écrit.
 */
function requireMediaWrite(req, res, next) {
  const rawFolder =
    String(req.params.folder || "misc") +
    (req.params.subfolder ? `/${String(req.params.subfolder)}` : "");
  if (!isValidFolder(rawFolder)) {
    return res.status(400).json({ error: "Dossier inconnu." });
  }
  const { canAccessMedia } = require("./permissions");
  const allowed = canAccessMedia(req.user, rawFolder, "write");
  if (!allowed.ok) {
    return res.status(403).json({ error: allowed.error || "Accès refusé à ce dossier." });
  }
  next();
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  // Le type est reverifie apres coup : multer ne fait que lire l'en-tete
  // declare par le client, qui peut mentir.
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      return cb(new Error("Format non supporte (JPEG, PNG, WebP ou AVIF)."));
    }
    cb(null, true);
  },
});

/**
 * Signe de fichier : la declaration du client ne suffit pas.
 *
 * On controle l'en-tete, et pour JPEG et PNG aussi la fin du fichier (marqueur
 * de fin). Un fichier tronque ou bricole qui porte le bon en-tete mais pas de
 * queue valide est ainsi refuse.
 */
const SIGNATURES = {
  ".jpg": (buffer) =>
    buffer.length > 4 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff &&
    // EOI JPEG (FF D9) en fin de fichier.
    buffer[buffer.length - 2] === 0xff &&
    buffer[buffer.length - 1] === 0xd9,
  ".png": (buffer) =>
    buffer.length > 12 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) &&
    // IEND PNG (49 45 4E 44 AE 42 60 82).
    buffer.subarray(-8).equals(Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82])),
  ".webp": (buffer) =>
    buffer.length > 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP",
  ".avif": (buffer) =>
    buffer.length > 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp",
};

/* ── Liste des medias ───────────────────────────────────────────────────── */

function ensureCloudTable() {
  db.exec(`CREATE TABLE IF NOT EXISTS cloud_media (
    url TEXT PRIMARY KEY,
    folder TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    bytes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
}
ensureCloudTable();

/** Tous les fichiers deposes, groupes par dossier, avec leur URL publique. */
router.get("/admin/media", requireAuth, (req, res) => {
  const { ownLocation } = require("./permissions");
  const role = (req.user && req.user.role) || "admin";
  if (role === "admin") {
    const own = ownLocation(req.user);
    if (!own) return res.status(403).json({ error: "Compte non rattaché à un restaurant." });
  }
  const out = [];

  const walk = (dir, prefix) => {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // dossier absent : pas encore de media
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, `${prefix}/${entry.name}`);
        continue;
      }
      if (!ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;

      const stats = fs.statSync(full);
      out.push({
        folder: prefix.replace(`${PUBLIC_PREFIX}/`, ""),
        name: entry.name,
        url: `${prefix}/${entry.name}`,
        bytes: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      });
    }
  };

  walk(UPLOAD_DIR, PUBLIC_PREFIX);
  for (const row of db.prepare("SELECT * FROM cloud_media").all()) {
    out.push({ folder: row.folder, name: row.name, url: row.url, bytes: Number(row.bytes), modifiedAt: row.created_at });
  }
  let files = out.sort((a, b) => a.url.localeCompare(b.url));
  let folders = FOLDERS;
  if (role === "admin") {
    const own = ownLocation(req.user);
    const allowed = `locations/${own}`;
    files = files.filter((f) => f.folder === allowed || f.folder.startsWith(`${allowed}/`) || (f.url.includes(`/${allowed}/`) || f.url.includes(`/${allowed}`)));
    folders = [allowed];
  }
  res.json({ files, maxBytes: MAX_BYTES, folders });
});

/* ── Envoi d'une image ──────────────────────────────────────────────────── */

async function mediaUploadHandler(req, res) {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier recu." });
  const rawFolder =
    String(req.params.folder || "misc") +
    (req.params.subfolder ? `/${String(req.params.subfolder)}` : "");
  const { canAccessMedia } = require("./permissions");
  const allowed = canAccessMedia(req.user, rawFolder, "write");
  if (!allowed.ok) {
    // Défense en profondeur : multer a déjà pu écrire le fichier — on le retire.
    if (req.file && req.file.path) { try { fs.unlinkSync(req.file.path); } catch {} }
    return res.status(403).json({ error: allowed.error || "Accès refusé à ce dossier." });
  }
  const buffer = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);
  if (!buffer) {
    return res.status(400).json({ error: "Aucun fichier reçu." });
  }
  const original = slug(path.parse(decodeName(req.file.originalname)).name) || "image";
  const ext = ALLOWED[req.file.mimetype] ?? ".jpg";
  const check = SIGNATURES[ext];
  if (!check || !check(buffer)) {
    if (req.file.path) { try { fs.unlinkSync(req.file.path); } catch {} }
    return res.status(400).json({ error: "Le contenu du fichier n'est pas une image valide." });
  }
  const { audit } = require("./audit");

  if (cloudinary.isConfigured()) {
    try {
      const result = await cloudinary.uploadBuffer(buffer, { folder: `texas-grillz/${rawFolder}`, name: original, mimetype: req.file.mimetype });
      db.prepare("INSERT OR REPLACE INTO cloud_media (url, folder, name, bytes) VALUES (?, ?, ?, ?)").run(result.secure_url, rawFolder, result.original_filename || original, result.bytes || buffer.length);
      audit(req.user, "media.upload", null, null, `Média Cloudinary ${rawFolder}/${original} déposé`);
      return res.status(201).json({ url: result.secure_url, name: result.original_filename || original, bytes: result.bytes || buffer.length });
    } catch (err) {
      console.error("[cloudinary]", err.message);
      return res.status(502).json({ error: "Envoi Cloudinary impossible." });
    }
  }

  // Repli local (Cloudinary non configuré).
  try { fs.unlinkSync(req.file.path); } catch {}
  const unique = crypto.randomBytes(4).toString("hex");
  const filename = `${original}-${unique}${ext}`;
  const dir = path.join(UPLOAD_DIR, rawFolder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  audit(req.user, "media.upload", null, null, `Média ${rawFolder}/${filename} déposé (local)`);
  res.status(201).json({ url: `${PUBLIC_PREFIX}/${rawFolder}/${filename}`, name: filename, bytes: buffer.length });
}

router.post("/admin/media/:folder", requireAuth, requireMediaWrite, upload.single("file"), mediaUploadHandler);
router.post("/admin/media/:folder/:subfolder", requireAuth, requireMediaWrite, upload.single("file"), mediaUploadHandler);

/* ── Où est utilisée cette image ? (super_admin) ─────────────────────────── */

router.get("/admin/media/usage", requireAuth, (req, res) => {
  const role = (req.user && req.user.role) || "admin";
  if (role !== "super_admin") {
    return res.status(403).json({ error: "Réservé au super admin." });
  }
  const url = String(req.query.url || "");
  if (!url) return res.status(400).json({ error: "Paramètre url requis." });
  res.json({ url, refs: mediaUsage(url) });
});

/** Suppression d'un media (Cloudinary ou local). */
router.delete("/admin/media", requireAuth, async (req, res) => {
  const url = String(req.query.url || "");
  const isCloud = url.startsWith("https://res.cloudinary.com/");
  // Chemin local : sous /uploads/ uniquement.
  if (!isCloud && (!url.startsWith(`${PUBLIC_PREFIX}/`) || url.includes(".."))) {
    return res.status(400).json({ error: "Chemin invalide." });
  }

  // Une image référencée ne se supprime pas : on évite de casser le site public.
  // La liste des usages est renvoyée pour que le super admin sache quoi détacher d'abord.
  const refs = mediaUsage(url);
  if (refs.length > 0) {
    return res.status(409).json({ error: "Image encore utilisée. Détachez-la d'abord.", refs });
  }

  // Autorisation : dossier Cloudinary = suffixe de l'URL cloudinary.
  const canFolder = isCloud ? url.replace(/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//, "") : url;
  const { canAccessMedia } = require("./permissions");
  const allowed = canAccessMedia(req.user, canFolder.replace(/^texas-grillz\//, ""), "write");
  if (!allowed.ok) {
    return res.status(403).json({ error: allowed.error || "Suppression refusée." });
  }

  if (isCloud) {
    try {
      await cloudinary.deleteByUrl(url);
      db.prepare("DELETE FROM cloud_media WHERE url = ?").run(url);
      scrubReferences(url);
      const { audit } = require("./audit");
      audit(req.user, "media.delete", null, null, `Média Cloudinary ${url} supprimé`);
      return res.status(204).end();
    } catch (err) {
      console.error("[cloudinary]", err.message);
      return res.status(502).json({ error: "Suppression Cloudinary impossible." });
    }
  }

  const relative = url.slice(PUBLIC_PREFIX.length + 1);
  const full = path.join(UPLOAD_DIR, relative);
  if (!full.startsWith(UPLOAD_DIR)) {
    return res.status(400).json({ error: "Chemin invalide." });
  }
  if (!fs.existsSync(full)) return res.status(404).json({ error: "Fichier introuvable." });

  fs.unlinkSync(full);
  scrubReferences(url);
  const { audit } = require("./audit");
  audit(req.user, "media.delete", null, null, `Média ${url} supprimé`);
  res.status(204).end();
});

/**
 * Erreurs de multer et de la limite de taille : elles arrivent au middleware
 * d'erreur general, qui renverrait 500. On les traduit ici pour que l'admin
 * reçoive un message exploitable.
 */
router.use((err, _req, res, next) => {
  if (err && err.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Fichier trop volumineux (8 Mo maximum)."
        : "Envoi refuse.";
    return res.status(400).json({ error: message });
  }
  if (err && typeof err.message === "string" && err.message.includes("Format non supporte")) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = {
  router,
  UPLOAD_DIR,
  PUBLIC_PREFIX,
  ALLOWED,
  ALLOWED_EXTENSIONS,
  FOLDERS,
  MAX_BYTES,
  slug,
  SIGNATURES,
  upload,
};
