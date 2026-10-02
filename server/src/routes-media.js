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

/** Sous-dossier cible : `products`, `gallery`, `locations`. */
const FOLDERS = ["products", "gallery", "locations", "misc"];

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
 * Noms de fichiers : on garde le nom utile pour le tri (brisket.jpg), suivi
 * d'un suffixe aleatoire qui garantit l'unicite sans ecraser un existant.
 */
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const folder = String(req.params.folder || "misc");
    const safe = FOLDERS.includes(folder) ? folder : "misc";
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

/** Tous les fichiers deposes, groupes par dossier, avec leur URL publique. */
router.get("/admin/media", requireAuth, (_req, res) => {
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
  out.sort((a, b) => a.url.localeCompare(b.url));
  res.json({ files: out, maxBytes: MAX_BYTES, folders: FOLDERS });
});

/* ── Envoi d'une image ──────────────────────────────────────────────────── */

/** Nom de champ attendu par multer pour le fichier. */
router.post(
  "/admin/media/:folder",
  requireAuth,
  upload.single("file"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier recu." });

    // Reverification du contenu : un .png renomme en .jpg avec un en-tete
    // declare faux ne doit pas passer.
    const buffer = fs.readFileSync(req.file.path);
    const check = SIGNATURES[path.extname(req.file.path).toLowerCase()];
    if (!check || !check(buffer)) {
      fs.unlinkSync(req.file.path); // fichier douteux : il ne reste pas sur le disque
      return res.status(400).json({ error: "Le contenu du fichier n'est pas une image valide." });
    }

    res.status(201).json({
      url: `${PUBLIC_PREFIX}/${req.params.folder}/${req.file.filename}`,
      name: req.file.filename,
      bytes: req.file.size,
    });
  }
);

/** Suppression d'un media (et de son fichier). */
router.delete("/admin/media", requireAuth, (req, res) => {
  const url = String(req.query.url || "");
  // On n'accepte qu'un chemin sous /uploads/ : impossible de viser un autre
  // fichier du serveur via cette route.
  if (!url.startsWith(`${PUBLIC_PREFIX}/`) || url.includes("..")) {
    return res.status(400).json({ error: "Chemin invalide." });
  }

  const relative = url.slice(PUBLIC_PREFIX.length + 1);
  const full = path.join(UPLOAD_DIR, relative);
  if (!full.startsWith(UPLOAD_DIR)) {
    return res.status(400).json({ error: "Chemin invalide." });
  }
  if (!fs.existsSync(full)) return res.status(404).json({ error: "Fichier introuvable." });

  fs.unlinkSync(full);
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
