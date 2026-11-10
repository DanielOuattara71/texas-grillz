/**
 * Restaurants — super_admin uniquement.
 *
 * Le bloc `locations` reste la source de données, mais ne peut être modifié
 * que par ces routes dédiées (unicité + immutabilité de l'id).
 */
const express = require("express");
const { z } = require("zod");
const { db } = require("./db");
const { requireAuth } = require("./routes-auth");
const { validateBlock } = require("./schemas");
const { audit } = require("./audit");

const router = express.Router();

function requireSuper(req, res) {
  if (!req.user || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Super admin requis." });
    return false;
  }
  return true;
}

function ensureRestaurantsTable() {
  db.exec(`CREATE TABLE IF NOT EXISTS restaurants (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    address    TEXT NOT NULL DEFAULT '',
    phone      TEXT NOT NULL DEFAULT '',
    image      TEXT NOT NULL DEFAULT '',
    maps_url   TEXT NOT NULL DEFAULT '',
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
}

function upsertRestaurantTable(row) {
  ensureRestaurantsTable();
  db.prepare(
    "INSERT INTO restaurants (id, name, address, phone, image, maps_url, active) VALUES (@id, @name, @address, @phone, @image, @mapsUrl, @active) ON CONFLICT(id) DO UPDATE SET name = excluded.name, address = excluded.address, phone = excluded.phone, image = excluded.image, maps_url = excluded.maps_url, active = excluded.active, updated_at = datetime('now')"
  ).run({
    id: row.id,
    name: row.name,
    address: row.address || "",
    phone: row.phone || "",
    image: row.image || "",
    mapsUrl: row.mapsUrl || "",
    active: row.active === false ? 0 : 1,
  });
}

function deleteRestaurantTable(id) {
  ensureRestaurantsTable();
  db.prepare("DELETE FROM restaurants WHERE id = ?").run(id);
}


function readLocations() {
  const row = db.prepare("SELECT payload FROM content WHERE key = ?").get("locations");
  if (!row) return [];
  try {
    const parsed = JSON.parse(row.payload);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocations(list) {
  const checked = validateBlock("locations", list);
  if (!checked.ok) return checked;
  const payload = JSON.stringify(checked.data);
  db.prepare(
    "INSERT INTO content (key, payload, updated_at) VALUES ('locations', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at"
  ).run(payload);
  return { ok: true, data: checked.data };
}

function readBlock(key) {
  const row = db.prepare("SELECT payload FROM content WHERE key = ?").get(key);
  if (!row) return null;
  try {
    return JSON.parse(row.payload);
  } catch {
    return null;
  }
}

function writeBlock(key, value) {
  const payload = JSON.stringify(value);
  db.prepare(
    "INSERT INTO content (key, payload, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at"
  ).run(key, payload);
}

const DEFAULT_HOURS = [
  { open: "12:00", close: "23:30" }, // dimanche
  { open: "12:00", close: "23:30" },
  { open: "12:00", close: "23:30" },
  { open: "12:00", close: "23:30" },
  { open: "12:00", close: "23:30" },
  { open: "12:00", close: "24:00" },
  { open: "12:00", close: "24:00" },
];

const locationInput = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/i).max(60),
  name: z.string().min(1).max(120),
  number: z.string().max(10).optional(),
  address: z.string().min(1).max(200),
  phone: z.string().min(1).max(40),
  image: z.string().max(500).default(""),
  mapsUrl: z.string().max(500).optional(),
  active: z.boolean().optional(),
  schedule: z.array(z.object({ open: z.string().nullable(), close: z.string().nullable() })).length(7).optional(),
});

router.get("/admin/locations", requireAuth, (req, res) => {
  if (!requireSuper(req, res)) return;
  res.json({ locations: readLocations() });
});

router.post("/admin/locations", requireAuth, (req, res) => {
  if (!requireSuper(req, res)) return;
  const parsed = locationInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Données invalides." });
  }
  const list = readLocations();
  if (list.some((e) => e && e.id === parsed.data.id)) {
    return res.status(409).json({ error: "Un restaurant avec cet identifiant existe déjà." });
  }
  const number = String(list.length + 1).padStart(2, "0");
  const location = {
    id: parsed.data.id,
    number: parsed.data.number || number,
    name: parsed.data.name,
    address: parsed.data.address,
    phone: parsed.data.phone,
    image: parsed.data.image || "",
    mapsUrl: parsed.data.mapsUrl || "",
    active: parsed.data.active !== undefined ? parsed.data.active : true,
    schedule: parsed.data.schedule || DEFAULT_HOURS,
  };
  const written = writeLocations([...list, location]);
  if (!written.ok) return res.status(422).json({ error: written.error });
  try { upsertRestaurantTable(location); } catch (err) { console.error("[restaurants]", err.message); }

  // Copie du menu commun vers <id>:menu et des horaires par défaut vers <id>:hours,
  // s'ils existent (ne jamais écraser un contenu déjà présent).
  const commonMenu = readBlock("menu");
  if (commonMenu !== null && readBlock(`${location.id}:menu`) === null) {
    writeBlock(`${location.id}:menu`, commonMenu);
  }
  if (readBlock(`${location.id}:hours`) === null) {
    writeBlock(`${location.id}:hours`, location.schedule);
  }

  audit(req.user, "location.create", "locations", location.id, `Restaurant ${location.id} créé`);
  res.status(201).json({ location });
});

router.patch("/admin/locations/:id", requireAuth, (req, res) => {
  if (!requireSuper(req, res)) return;
  const id = String(req.params.id);
  const list = readLocations();
  const index = list.findIndex((e) => e && e.id === id);
  if (index < 0) return res.status(404).json({ error: "Restaurant introuvable." });
  const body = req.body || {};
  // L'id est immutable : on ignore tout changement d'id.
  const next = { ...list[index], ...body, id };
  const checked = validateBlock("locations", [next]);
  if (!checked.ok) return res.status(422).json({ error: checked.error });
  const updated = Array.isArray(checked.data) ? checked.data[0] : next;
  const newList = list.map((e, i) => (i === index ? updated : e));
  const written = writeLocations(newList);
  if (!written.ok) return res.status(422).json({ error: written.error });
  try { upsertRestaurantTable(updated); } catch (err) { console.error("[restaurants]", err.message); }

  // Propage les horaires du restaurant si `schedule` a été envoyé.
  if (body.schedule) {
    writeBlock(`${id}:hours`, body.schedule);
  }
  audit(req.user, "location.update", "locations", id, `Restaurant ${id} modifié`);
  res.json({ location: updated });
});

router.delete("/admin/locations/:id", requireAuth, (req, res) => {
  if (!requireSuper(req, res)) return;
  const id = String(req.params.id);
  const attached = db.prepare("SELECT COUNT(*) AS n FROM users WHERE location_id = ?").get(id);
  if (attached && Number(attached.n) > 0) {
    return res.status(400).json({ error: "Suppression refusée : un compte admin est rattaché à ce restaurant." });
  }
  const list = readLocations();
  const next = list.filter((e) => !(e && e.id === id));
  if (next.length === list.length) return res.status(404).json({ error: "Restaurant introuvable." });
  const written = writeLocations(next);
  if (!written.ok) return res.status(422).json({ error: written.error });
  try { deleteRestaurantTable(id); } catch (err) { console.error("[restaurants]", err.message); }
  db.prepare("DELETE FROM content WHERE key LIKE ?").run(`${id}:%`);
  audit(req.user, "location.delete", "locations", id, `Restaurant ${id} supprimé`);
  res.status(204).end();
});

router.get("/admin/audit", requireAuth, (req, res) => {
  const role = (req.user && req.user.role) || "admin";
  if (role !== "super_admin" && role !== "developer") {
    return res.status(403).json({ error: "Accès refusé au journal." });
  }
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const q = req.query.q ? `%${String(req.query.q)}%` : null;
  const location = req.query.location ? String(req.query.location) : null;
  const rows = db
    .prepare(
      `SELECT id, user_id, action, "key", location_id, summary, at FROM audit_log
        WHERE (@q IS NULL OR action LIKE @q OR summary LIKE @q OR "key" LIKE @q)
          AND (@loc IS NULL OR location_id = @loc)
        ORDER BY id DESC LIMIT @limit OFFSET @offset`
    )
    .all({ q, loc: location, limit, offset });
  res.json({ rows, limit, offset });
});

module.exports = { router, readLocations };
