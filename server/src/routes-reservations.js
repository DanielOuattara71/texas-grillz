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
  message: { error: "Trop de demandes envoyees. Appelez-nous au 04 78 00 00 00." },
});

const reservationInput = z.object({
  name: z.string().trim().min(1, "Nom requis.").max(120),
  email: z.string().trim().email("Adresse email invalide.").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ)."),
  guests: z.string().trim().min(1).max(10),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

const insert = db.prepare(
  `INSERT INTO reservations (name, email, phone, date, guests, message)
   VALUES (@name, @email, @phone, @date, @guests, @message)`
);

/* ── Public : envoi depuis le site ──────────────────────────────────────── */

router.post("/reservations", publicLimiter, (req, res) => {
  const parsed = reservationInput.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return res.status(400).json({ error: first?.message || "Demande invalide." });
  }

  const info = insert.run({
    ...parsed.data,
    phone: parsed.data.phone || null,
    message: parsed.data.message || null,
  });

  res.status(201).json({ id: info.lastInsertRowid, received: true });
});

/* ── Admin : lecture et suivi ───────────────────────────────────────────── */

const listStmt = db.prepare(
  `SELECT id, name, email, phone, date, guests, message, status, created_at
     FROM reservations
    WHERE (@status IS NULL OR status = @status)
      AND (@search IS NULL
           OR name LIKE @search OR email LIKE @search OR message LIKE @search)
    ORDER BY date DESC, id DESC
    LIMIT @limit OFFSET @offset`
);

const countStmt = db.prepare(
  `SELECT COUNT(*) AS n FROM reservations
    WHERE (@status IS NULL OR status = @status)
      AND (@search IS NULL
           OR name LIKE @search OR email LIKE @search OR message LIKE @search)`
);

router.get("/admin/reservations", requireAuth, (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  const search = req.query.q ? `%${String(req.query.q)}%` : null;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const rows = listStmt.all({ status, search, limit, offset });
  const total = countStmt.get({ status, search }).n;

  // Repartition par statut : le badge « a traiter » de l'admin s'appuie dessus.
  const byStatus = db
    .prepare("SELECT status, COUNT(*) AS n FROM reservations GROUP BY status")
    .all()
    .reduce((acc, row) => ({ ...acc, [row.status]: row.n }), {});

  res.json({ rows, total, byStatus, limit, offset });
});

const STATUSES = ["nouvelle", "confirmee", "annulee", "traitee"];

const setStatus = db.prepare(
  "UPDATE reservations SET status = ? WHERE id = ?"
);

router.patch("/admin/reservations/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || "");
  if (!Number.isInteger(id) || !STATUSES.includes(status)) {
    return res.status(400).json({ error: "Statut invalide." });
  }
  const info = setStatus.run(status, id);
  if (info.changes === 0) return res.status(404).json({ error: "Demande introuvable." });
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
  const status = req.query.status ? String(req.query.status) : null;
  const search = req.query.q ? `%${String(req.query.q)}%` : null;
  const rows = listStmt.all({ status, search, limit: 200, offset: 0 });

  const header = ["id", "date", "guests", "name", "email", "phone", "status", "message", "created_at"];
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
