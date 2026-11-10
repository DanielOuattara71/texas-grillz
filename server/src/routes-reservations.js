/**
 * Demandes de reservation.
 *
 * `POST /api/reservations` est public et non authentifie : c'est le formulaire
 * du site. Tout le reste (lire, changer le statut, exporter) exige une session
 * d'admin. Le formulaire public est limite en IP pour freiner le spam.
 */
const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const { db } = require("./db");
const { requireAuth } = require("./routes-auth");

const router = express.Router();

/**
 * Anti-spam : 5 demandes par heure et par IP. Un couple qui reserve pour
 * 12 personnes passe largement en dessous ; un script, non.
 */
const publicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Trop de demandes envoyees. Appelez-nous au 07 77 59 59 47." },
});

const reservationInput = z.object({
  name: z.string().trim().min(1, "Nom requis.").max(120),
  email: z.string().trim().email("Adresse email invalide.").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  /** Id du site (branche) ou lieu auquel la demande se rattache. */
  locationId: z.string().trim().min(1, "Le site est requis.").max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)."),
  /** Heure souhaitée de la table. HH:MM — affichée telle quelle dans le suivi. */
  time: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Heure invalide (HH:MM).").optional().or(z.literal("")),
  guests: z.string().trim().min(1).max(10),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

/** "9:30" -> "09:30"; ""/null -> "". */
function normalizeTime(value) {
  if (!value) return "";
  const match = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return String(value);
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

const insert = db.prepare(
  `INSERT INTO reservations (name, email, phone, date, time, guests, message, location_id)
   VALUES (@name, @email, @phone, @date, @time, @guests, @message, @locationId)`
);

/* ── Public : envoi depuis le site ──────────────────────────────────────── */

function knownLocations() {
  try {
    const row = db.prepare("SELECT payload FROM content WHERE key = ?").get("locations");
    if (!row) return null;
    const list = JSON.parse(row.payload);
    return Array.isArray(list) ? list : null;
  } catch {
    return null;
  }
}

router.post("/reservations", publicLimiter, (req, res) => {
  const parsed = reservationInput.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return res.status(400).json({ error: first?.message || "Demande invalide." });
  }

  // Le restaurant doit exister, être actif et visible, quand la liste est connue.
  const known = knownLocations();
  if (known) {
    const found = known.find((e) => e && e.id === parsed.data.locationId);
    if (!found || found.active === false || found.published === false || found.status === "bientot" || found.status === "inactif") {
      return res.status(400).json({ error: "Restaurant inconnu ou indisponible." });
    }
  }

  const info = insert.run({
    ...parsed.data,
    phone: parsed.data.phone || null,
    message: parsed.data.message || null,
    time: normalizeTime(parsed.data.time),
  });

  res.status(201).json({ id: info.lastInsertRowid, received: true });
});

/* ── Admin : lecture et suivi ───────────────────────────────────────────── */

const listStmt = db.prepare(
  `SELECT id, name, email, phone, date, time, guests, message, status, created_at, location_id
     FROM reservations
    WHERE (@status IS NULL OR status = @status)
      AND (@location IS NULL OR location_id = @location)
      AND (@date IS NULL OR date = @date)
      AND (@dateFrom IS NULL OR date >= @dateFrom)
      AND (@dateTo IS NULL OR date <= @dateTo)
      AND (@search IS NULL
           OR name LIKE @search OR email LIKE @search OR message LIKE @search)
    ORDER BY date DESC, COALESCE(NULLIF(time, ''), '00:00') DESC, id DESC
    LIMIT @limit OFFSET @offset`
);

const countStmt = db.prepare(
  `SELECT COUNT(*) AS n FROM reservations
    WHERE (@status IS NULL OR status = @status)
      AND (@location IS NULL OR location_id = @location)
      AND (@date IS NULL OR date = @date)
      AND (@dateFrom IS NULL OR date >= @dateFrom)
      AND (@dateTo IS NULL OR date <= @dateTo)
      AND (@search IS NULL
           OR name LIKE @search OR email LIKE @search OR message LIKE @search)`
);

/** Stats du même périmètre (sans le filtre statut, pour que les badges s'auto-affichent). */
const statsStmt = db.prepare(
  `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN date = @today THEN 1 ELSE 0 END) AS today,
      SUM(CASE WHEN status = 'nouvelle' THEN 1 ELSE 0 END) AS nouvelle,
      SUM(CASE WHEN status = 'confirmee' THEN 1 ELSE 0 END) AS confirmee,
      SUM(CASE WHEN status = 'annulee' THEN 1 ELSE 0 END) AS annulee
     FROM reservations
    WHERE (@location IS NULL OR location_id = @location)
      AND (@date IS NULL OR date = @date)
      AND (@dateFrom IS NULL OR date >= @dateFrom)
      AND (@dateTo IS NULL OR date <= @dateTo)
      AND (@search IS NULL
           OR name LIKE @search OR email LIKE @search OR message LIKE @search)`
);

/** Date du jour à Abidjan (Africa/Abidjan = UTC+0, mais explicite vaut mieux qu'implicite). */
const todayAbidjan = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "Africa/Abidjan" });

const STATUSES = ["nouvelle", "confirmee", "annulee", "traitee"];

/** Filtres de dates : `date` (exacte) **ou** période `date_from`–`date_to` (ordre inversé toléré). */
function dateFilters(query) {
  const ok = (value) => {
    const text = String(value || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
  };
  let dateFrom = ok(query.date_from);
  let dateTo = ok(query.date_to);
  if (dateFrom && dateTo && dateTo < dateFrom) [dateFrom, dateTo] = [dateTo, dateFrom];
  return { date: ok(query.date), dateFrom, dateTo };
}

router.get("/admin/reservations", requireAuth, (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  const search = req.query.q ? `%${String(req.query.q)}%` : null;
  const requestedLocation = req.query.location ? String(req.query.location) : null;
  const { date, dateFrom, dateTo } = dateFilters(req.query);
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const { reservationScope } = require("./permissions");
  const scoped = reservationScope(req.user, requestedLocation);
  if (!scoped.ok) return res.status(403).json({ error: scoped.error });
  const location = scoped.location;

  const rows = listStmt.all({ status, search, location, date, dateFrom, dateTo, limit, offset });
  const total = countStmt.get({ status, search, location, date, dateFrom, dateTo }).n;

  // Répartition par statut : badges.
  const byStatus = db
    .prepare(
      `SELECT status, COUNT(*) AS n FROM reservations
        WHERE (@location IS NULL OR location_id = @location)
          AND (@date IS NULL OR date = @date)
          AND (@dateFrom IS NULL OR date >= @dateFrom)
          AND (@dateTo IS NULL OR date <= @dateTo)
          AND (@search IS NULL
               OR name LIKE @search OR email LIKE @search OR message LIKE @search)
        GROUP BY status`
    )
    .all({ location, date, dateFrom, dateTo, search })
    .reduce((acc, row) => ({ ...acc, [row.status]: row.n }), {});

  const stats = statsStmt.get({
    location,
    date,
    dateFrom,
    dateTo,
    search,
    today: todayAbidjan(),
  }) || {};

  res.json({
    rows,
    total,
    byStatus,
    limit,
    offset,
    stats: {
      total: Number(stats.total || 0),
      today: Number(stats.today || 0),
      nouvelle: Number(stats.nouvelle || 0),
      confirmee: Number(stats.confirmee || 0),
      annulee: Number(stats.annulee || 0),
    },
  });
});

const setStatus = db.prepare(
  "UPDATE reservations SET status = ? WHERE id = ?"
);

router.patch("/admin/reservations/:id", requireAuth, (req, res) => {
  const role = (req.user && req.user.role) || "admin";
  if (role === "developer") {
    return res.status(403).json({ error: "Accès lecture seule." });
  }
  const id = Number(req.params.id);
  const status = String(req.body?.status || "");
  if (!Number.isInteger(id) || !STATUSES.includes(status)) {
    return res.status(400).json({ error: "Statut invalide." });
  }
  const found = db.prepare("SELECT * FROM reservations WHERE id = ?").get(id);
  if (!found) return res.status(404).json({ error: "Demande introuvable." });
  const { ownLocation } = require("./permissions");
  if (role === "admin") {
    const own = ownLocation(req.user);
    if (!own || found.location_id !== own) {
      const { audit } = require("./audit");
      audit(req.user, "reservation.denied", null, found.location_id || null, `PATCH réservation ${id} refusé`);
      return res.status(403).json({ error: "Accès refusé à cette réservation." });
    }
  }
  const { audit } = require("./audit");
  const info = setStatus.run(status, id);
  if (info.changes === 0) return res.status(404).json({ error: "Demande introuvable." });
  audit(req.user, "reservation.status", null, found.location_id || null, `Réservation ${id} → ${status}`);
  res.json({ id, status });
});

/**
 * Export CSV des demandes filtrees, pour un carnet ou un tableur.
 * Les guillemets doubles neutralisent un eventuel separateur dans un champ
 * saisi par un visiteur (le message libre).
 */
const csvCell = (value) => {
  const text = value == null ? "" : String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

router.get("/admin/reservations.csv", requireAuth, (req, res) => {
  const role = (req.user && req.user.role) || "admin";
  if (role === "developer") {
    return res.status(403).json({ error: "Accès lecture seule." });
  }
  const status = req.query.status ? String(req.query.status) : null;
  const search = req.query.q ? `%${String(req.query.q)}%` : null;
  const requestedLocation = req.query.location ? String(req.query.location) : null;
  const { date, dateFrom, dateTo } = dateFilters(req.query);
  const { reservationScope } = require("./permissions");
  const scoped = reservationScope(req.user, requestedLocation);
  if (!scoped.ok) return res.status(403).json({ error: scoped.error });
  const location = scoped.location;
  const rows = listStmt.all({ status, search, location, date, dateFrom, dateTo, limit: 500, offset: 0 });

  const header = ["id", "date", "time", "guests", "name", "email", "phone", "location_id", "status", "message", "created_at"];
  const lines = [
    header.join(";"),
    ...rows.map((r) => header.map((k) => csvCell(r[k])).join(";")),
  ];

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="reservations.csv"');
  // BOM UTF-8 (U+FEFF) : sans lui, Excel francais massacre les accents.
  res.send("\ufeff" + lines.join("\r\n"));
});

module.exports = { router };
