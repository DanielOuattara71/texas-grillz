/**
 * Entités Restaurant + Plat (tables normalisées).
 *
 * - Restaurant : 1-ligne par adresse (id immuable).
 * - Plat : toujours lié à 1 seul restaurant (`location_id` = restoID).
 * - Un admin peut ajouter plusieurs plats pour SON restaurant.
 * - Un restaurant est attribué à un et un seul admin (voir règle métier
 *   `users.location_id` unique pour le rôle admin + index partiel).
 * - Super admin : crée restaurants + plusieurs admins, lit/écrit tout.
 */
const express = require("express");
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { db } = require("./db");
const { requireAuth } = require("./routes-auth");
const { audit } = require("./audit");
const { imageUrl, price: zPrice } = require("./schemas").schemas;
const { upsertBlockEntry, removeBlockEntry, purgeRestaurantBlocks } = require("./locations-sync");

const router = express.Router();

function toRestaurant(r, withAdmin = false) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    description: r.description || "",
    email: r.email || "",
    address: r.address,
    phone: r.phone,
    image: r.image,
    mapsUrl: r.maps_url || "",
    active: Number(r.active) === 1,
    published: Number(r.published ?? 1) === 1,
    created_at: r.created_at,
    ...(withAdmin ? { admin: r.admin_id ? { id: r.admin_id, email: r.admin_email, name: r.admin_name, phone: r.admin_phone || "", active: Number(r.admin_active ?? 1) === 1, must_change_password: Number(r.admin_must_change_password ?? 1) === 1, last_login_at: r.admin_last_login_at ?? null } : null } : {}),
  };
}

/** Colonnes de l'admin attaché (jamais le mot de passe). */
const ADMIN_SELECT = `u.id AS admin_id, u.email AS admin_email, u.name AS admin_name, u.phone AS admin_phone,
  u.active AS admin_active, u.must_change_password AS admin_must_change_password, u.last_login_at AS admin_last_login_at`;

function toPlat(p) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    category: p.category,
    priceFrom: Boolean(Number(p.price_from)),
    image: p.image,
    locationId: p.location_id,
    restaurantId: p.location_id,
  };
}

const restaurantAdminInput = z.object({
  name: z.string().min(1, "Le nom et prénom de l'administrateur sont requis.").max(120),
  email: z.string().email("Adresse e-mail de l'administrateur invalide.").max(200).optional(),
  phone: z.string().max(40).optional().or(z.literal("")),
});

const restaurantInput = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/i).max(60),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().default(""),
  email: z.string().max(200).optional().default(""),
  address: z.string().min(1).max(200),
  phone: z.string().min(1).max(40),
  image: z.string().max(500).default(""),
  mapsUrl: z.string().max(500).optional(),
  active: z.boolean().optional(),
  published: z.boolean().optional(),
  /** Création centralisée : le restaurant et son administrateur en une seule opération. */
  admin: restaurantAdminInput,
});

const platInput = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/i).max(60),
  name: z.string().min(1).max(120),
  description: z.string().max(400).default(""),
  price: zPrice,
  category: z.string().min(1, "Catégorie requise.").max(60),
  priceFrom: z.boolean().optional(),
  image: imageUrl.optional().default(""),
  locationId: z.string().min(1).max(60),
});

const categoryInput = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/i).max(60),
  label: z.string().min(1, "Libellé requis.").max(120),
  note: z.string().max(300).optional(),
  sort: z.coerce.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
  locationId: z.string().max(60).optional(),
});

function toCategory(c) {
  if (!c) return null;
  return {
    id: c.id,
    locationId: c.location_id,
    label: c.label,
    note: c.note || "",
    sort: Number(c.sort),
    active: Number(c.active) === 1,
    createdAt: c.created_at,
  };
}

function resolveCategoryOwner(user, requested) {
  const role = (user && user.role) || "admin";
  if (role === "super_admin") return { ok: true, locationId: requested || null };
  if (role === "developer") {
    return { ok: false, error: "Accès lecture seule (rôle technique)." };
  }
  const own = user && user.location_id ? String(user.location_id) : null;
  if (!own) return { ok: false, error: "Compte non rattaché à un restaurant." };
  if (requested && requested !== own) return { ok: false, error: "Accès refusé à ce restaurant." };
  return { ok: true, locationId: own };
}

function seedDefaultCategories(locationId) {
  const seed = db.prepare(`INSERT OR IGNORE INTO categories (id, location_id, label, note, sort, active)
    VALUES (?, ?, ?, ?, ?, 1)`);
  const rows = [
    ["mix-grill", "Mix Grill", "Plateaux de viandes grillées à partager.", 1],
    ["saisonniers", "Saisonniers", "Suggestions du moment.", 2],
    ["bbq", "Viande BBQ", "Poulet texan, côtes de porc, steak et ribs, sauce secrète de la maison.", 3],
    ["burgers", "Burgers", "Les burgers maison.", 4],
    ["brochettes", "Brochettes", "Brochettes grillées, servies sans accompagnement.", 5],
    ["garnitures", "Garnitures", "Accompagnements à ajouter à votre plat.", 6],
    ["weekend", "Week-end Carnivore", "Menu du week-end. Accompagnement de base : attiéké.", 7],
    ["boissons", "Boissons", "Softs, bières, jus, liqueurs et vins.", 8],
  ];
  for (const [id, label, note, sort] of rows) seed.run(id, locationId, label, note, sort);
}

/* ── Public : restaurants actifs + plats par restaurant ─────────────────── */

router.get("/restaurants", (_req, res) => {
  const hasTable = db.prepare("SELECT COUNT(*) AS n FROM restaurants").get().n > 0;
  if (hasTable) {
    const rows = db.prepare("SELECT * FROM restaurants WHERE active = 1 AND published = 1 ORDER BY id").all();
    return res.json({ restaurants: rows.map(toRestaurant) });
  }
  // Repli sur le bloc `locations` (content) si la table n'est pas encore migrée.
  try {
    const row = db.prepare("SELECT payload FROM content WHERE key = ?").get("locations");
    const list = row ? JSON.parse(row.payload) : [];
    return res.json({ restaurants: Array.isArray(list) ? list.filter((e) => e && e.active !== false).map((e) => ({ id: e.id, name: e.name, address: e.address || "", phone: e.phone || "", image: e.image || "", mapsUrl: e.mapsUrl || "", active: true })) : [] });
  } catch {
    return res.json({ restaurants: [] });
  }
});

router.get("/plats", (req, res) => {
  const locationId = req.query.location ? String(req.query.location) : null;
  let rows;
  if (locationId) {
    rows = db
      .prepare("SELECT * FROM plats WHERE location_id = ? ORDER BY category, name")
      .all(locationId);
  } else {
    rows = db.prepare("SELECT * FROM plats ORDER BY location_id, category, name").all();
  }
  res.json({ plats: rows.map(toPlat) });
});

/** Catégories publiques : `?location=<id>` sinon toutes. */
router.get("/categories", (req, res) => {
  const locationId = req.query.location ? String(req.query.location) : null;
  const rows = locationId
    ? db.prepare("SELECT * FROM categories WHERE location_id = ? AND active = 1 ORDER BY sort, label").all(locationId)
    : db.prepare("SELECT * FROM categories WHERE active = 1 ORDER BY location_id, sort, label").all();
  res.json({ categories: rows.map(toCategory) });
});

/* ── Admin : catégories par restaurant ───────────────────────────────────── */

router.get("/admin/categories", requireAuth, (req, res) => {
  const role = (req.user && req.user.role) || "admin";
  const locationId = req.query.location ? String(req.query.location) : null;
  const own = req.user.location_id ? String(req.user.location_id) : null;
  if (role === "admin") {
    if (!own) return res.status(403).json({ error: "Compte non rattaché à un restaurant." });
    const rows = db.prepare("SELECT * FROM categories WHERE location_id = ? ORDER BY sort, label").all(own);
    return res.json({ categories: rows.map(toCategory) });
  }
  if (locationId) {
    const rows = db.prepare("SELECT * FROM categories WHERE location_id = ? ORDER BY sort, label").all(locationId);
    return res.json({ categories: rows.map(toCategory) });
  }
  const rows = db.prepare("SELECT * FROM categories ORDER BY location_id, sort, label").all();
  res.json({ categories: rows.map(toCategory) });
});

router.post("/admin/categories", requireAuth, (req, res) => {
  const parsed = categoryInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Données invalides." });
  const d = parsed.data;
  const scoped = resolveCategoryOwner(req.user, d.locationId || null);
  if (!scoped.ok || !scoped.locationId) return res.status(403).json({ error: scoped.error || "Restaurant requis." });
  try {
    db.prepare(
      "INSERT INTO categories (id, location_id, label, note, sort, active) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(d.id, scoped.locationId, d.label, d.note || "", d.sort ?? 99, d.active === false ? 0 : 1);
  } catch (e) {
    if (e && e.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      return res.status(409).json({ error: "Cette catégorie existe déjà pour ce restaurant." });
    }
    throw e;
  }
  audit(req.user, "category.create", null, scoped.locationId, `Catégorie ${d.id} créée pour ${scoped.locationId}`);
  const row = db.prepare("SELECT * FROM categories WHERE id = ? AND location_id = ?").get(d.id, scoped.locationId);
  res.status(201).json({ category: toCategory(row) });
});

router.patch("/admin/categories/:locationId/:id", requireAuth, (req, res) => {
  const locationId = String(req.params.locationId);
  const id = String(req.params.id);
  const role = (req.user && req.user.role) || "admin";
  const own = req.user.location_id ? String(req.user.location_id) : null;
  if (role === "developer") {
    return res.status(403).json({ error: "Accès lecture seule (rôle technique)." });
  }
  if (role === "admin" && locationId !== own) {
    audit(req.user, "category.denied", null, locationId, `PATCH catégorie ${id} refusé`);
    return res.status(403).json({ error: "Accès refusé à ce restaurant." });
  }
  const existing = db.prepare("SELECT * FROM categories WHERE id = ? AND location_id = ?").get(id, locationId);
  if (!existing) return res.status(404).json({ error: "Catégorie introuvable." });
  const body = req.body || {};
  const next = {
    label: body.label !== undefined ? String(body.label) : existing.label,
    note: body.note !== undefined ? String(body.note) : existing.note,
    sort: body.sort !== undefined ? Number(body.sort) : Number(existing.sort),
    active: body.active !== undefined ? (body.active ? 1 : 0) : Number(existing.active),
  };
  db.prepare(
    "UPDATE categories SET label = @label, note = @note, sort = @sort, active = @active WHERE id = @id AND location_id = @location_id"
  ).run({ ...next, id, location_id: locationId });
  audit(req.user, "category.update", null, locationId, `Catégorie ${id} modifiée pour ${locationId}`);
  const row = db.prepare("SELECT * FROM categories WHERE id = ? AND location_id = ?").get(id, locationId);
  res.json({ category: toCategory(row) });
});

/**
 * Suppression : retire les plats de cette catégorie pour ce restaurant.
 * (Pas de FK plate→catégorie composite : suppression de la catégorie supprime les plats qui y étaientrattachés.)
 */
router.delete("/admin/categories/:locationId/:id", requireAuth, (req, res) => {
  const locationId = String(req.params.locationId);
  const id = String(req.params.id);
  const role = (req.user && req.user.role) || "admin";
  const own = req.user.location_id ? String(req.user.location_id) : null;
  if (role === "developer") {
    return res.status(403).json({ error: "Accès lecture seule (rôle technique)." });
  }
  if (role === "admin" && locationId !== own) {
    audit(req.user, "category.denied", null, locationId, `DELETE catégorie ${id} refusé`);
    return res.status(403).json({ error: "Accès refusé à ce restaurant." });
  }
  const existing = db.prepare("SELECT * FROM categories WHERE id = ? AND location_id = ?").get(id, locationId);
  if (!existing) return res.status(404).json({ error: "Catégorie introuvable." });
  const purge = db.prepare("DELETE FROM plats WHERE location_id = ? AND category = ?").run(locationId, id);
  db.prepare("DELETE FROM categories WHERE id = ? AND location_id = ?").run(id, locationId);
  audit(req.user, "category.delete", null, locationId, `Catégorie ${id} supprimée pour ${locationId} (${purge.changes} plat(s) retirés)`);
  res.status(204).end();
});

/* ── Admin : restaurants (super_admin) ──────────────────────────────────── */

function requireSuper(req, res) {
  if (!req.user || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Super admin requis." });
    return false;
  }
  return true;
}

router.get("/admin/restaurants", requireAuth, (req, res) => {
  if (!requireSuper(req, res)) return;
  const rows = db
    .prepare(`SELECT r.*, ${ADMIN_SELECT} FROM restaurants r LEFT JOIN users u ON u.location_id = r.id AND u.role = 'admin' ORDER BY r.id, u.id`)
    .all();
  // Un admin rattaché au maximum par restaurant (règle métier) ; ON LIMIT 1 par resto.
  const seen = new Set();
  const restaurants = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    restaurants.push(toRestaurant(row, true));
  }
  res.json({ restaurants });
});

router.post("/admin/restaurants", requireAuth, (req, res) => {
  if (!requireSuper(req, res)) return;
  const parsed = restaurantInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Données invalides." });
  const d = parsed.data;
  const restoEmail = d.email ? String(d.email).trim().toLowerCase() : "";
  // Email de l'administrateur : fourni explicitement, ou généré (gerant+<resto>[-n]@texas-grillz.fr).
  const baseEmail = `gerant+${d.id}@texas-grillz.fr`;
  let email = d.admin.email ? String(d.admin.email).trim().toLowerCase() : null;
  if (!email) {
    email = baseEmail;
    let i = 2;
    while (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
      email = `gerant+${d.id}-${i}@texas-grillz.fr`;
      i += 1;
      if (i > 50) {
        return res.status(409).json({ error: "Impossible de générer un e-mail d'administrateur unique." });
      }
    }
  } else if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
    return res.status(409).json({ error: "Un compte existe déjà pour cet e-mail d'administrateur." });
  }
  if (restoEmail && restoEmail === email) {
    return res.status(400).json({ error: "L'e-mail du restaurant et celui de l'administrateur doivent être différents." });
  }
  // Pré-contrôles (pas d'écriture partielle en cas d'échec).
  if (db.prepare("SELECT 1 FROM restaurants WHERE id = ?").get(d.id)) {
    return res.status(409).json({ error: "Un restaurant avec cet identifiant existe déjà." });
  }

  const temp = `Tg-${crypto.randomBytes(6).toString("hex")}-!`;
  const passwordHash = bcrypt.hashSync(temp, 12);

  /** Création atomique : table + bloc `locations` + catégories + admin. */
  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO restaurants (id, name, description, email, address, phone, image, maps_url, active, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(d.id, d.name, d.description, restoEmail, d.address, d.phone, d.image || "", d.mapsUrl || "", d.active === false ? 0 : 1, d.published === false ? 0 : 1);
    seedDefaultCategories(d.id);
    const blockEntry = {
      id: d.id,
      name: d.name,
      address: d.address,
      phone: d.phone,
      image: d.image || "",
      mapsUrl: d.mapsUrl || "",
      active: d.active !== false,
      published: d.published !== false,
    };
    const written = upsertBlockEntry(blockEntry);
    if (!written.ok) {
      throw new Error(`locations block invalide: ${written.error}`);
    }
    db.prepare(
      "INSERT INTO users (email, name, password_hash, location_id, phone, role, active, must_change_password, created_by) VALUES (?, ?, ?, ?, ?, 'admin', 1, 1, ?)"
    ).run(email, d.admin.name, passwordHash, d.id, d.admin.phone || "", req.user.id);
  });

  try {
    tx();
  } catch (e) {
    console.error("[restaurants] création atomique impossible", e && e.message);
    return res.status(500).json({ error: "Création impossible : rien n'a été enregistré." });
  }

  audit(req.user, "restaurant.create", null, d.id, `Restaurant ${d.id} créé avec admin ${email}`);
  const row = db
    .prepare(`SELECT r.*, ${ADMIN_SELECT} FROM restaurants r LEFT JOIN users u ON u.location_id = r.id AND u.role = 'admin' WHERE r.id = ?`)
    .get(d.id);
  res.status(201).json({ restaurant: toRestaurant(row, true), temporaryPassword: temp });
});

router.patch("/admin/restaurants/:id", requireAuth, (req, res) => {
  if (!requireSuper(req, res)) return;
  const id = String(req.params.id);
  let existing = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(id);
  if (!existing) {
    // Synchro depuis le bloc content `locations` si la table n'a pas encore la ligne.
    const row = db.prepare("SELECT payload FROM content WHERE key = ?").get("locations");
    if (row) {
      let list = [];
      try { const v = JSON.parse(row.payload); list = Array.isArray(v) ? v : [] } catch {}
      const one = list.find((e) => e && e.id === id);
      if (one) {
        db.prepare("INSERT INTO restaurants (id, name, address, phone, image, maps_url, active, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(one.id, one.name, one.address || "", one.phone || "", one.image || "", one.mapsUrl || one.maps_url || "", one.active === false ? 0 : 1, one.published === false ? 0 : 1);
        seedDefaultCategories(one.id);
        existing = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(id);
      }
    }
    if (!existing) return res.status(404).json({ error: "Restaurant introuvable." });
  }
  const body = req.body || {};
  const next = {
    name: body.name !== undefined ? String(body.name) : existing.name,
    description: body.description !== undefined ? String(body.description) : (existing.description || ""),
    email: body.email !== undefined ? String(body.email).trim().toLowerCase() : (existing.email || ""),
    address: body.address !== undefined ? String(body.address) : existing.address,
    phone: body.phone !== undefined ? String(body.phone) : existing.phone,
    image: body.image !== undefined ? String(body.image) : existing.image,
    maps_url: body.mapsUrl !== undefined ? String(body.mapsUrl) : existing.maps_url,
    active: body.active !== undefined ? (body.active ? 1 : 0) : Number(existing.active),
    published: body.published !== undefined ? (body.published ? 1 : 0) : Number(existing.published ?? 1),
  };
  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE restaurants SET name = @name, description = @description, email = @email, address = @address, phone = @phone, image = @image, maps_url = @maps_url, active = @active, published = @published, updated_at = datetime('now') WHERE id = @id"
    ).run({ ...next, id });
    const blockEntry = {};
    const map = { name: next.name, address: next.address, phone: next.phone, image: next.image, mapsUrl: next.maps_url, active: Number(next.active) === 1, published: Number(next.published) === 1 };
    for (const [key, value] of Object.entries(map)) {
      if (body[key] !== undefined || body.name !== undefined || body.address !== undefined || body.phone !== undefined || body.image !== undefined || body.mapsUrl !== undefined || body.active !== undefined || body.published !== undefined) {
        blockEntry[key] = value;
      }
    }
    const written = upsertBlockEntry({ id, ...blockEntry });
    if (!written.ok) throw new Error(`locations block invalide: ${written.error}`);
  });
  try {
    tx();
  } catch (e) {
    console.error("[restaurants] modification impossible", e && e.message);
    return res.status(500).json({ error: "Modification impossible." });
  }
  audit(req.user, "restaurant.update", null, id, `Restaurant ${id} modifié`);
  const row = db
    .prepare(`SELECT r.*, ${ADMIN_SELECT} FROM restaurants r LEFT JOIN users u ON u.location_id = r.id AND u.role = 'admin' WHERE r.id = ?`)
    .get(id);
  res.json({ restaurant: toRestaurant(row, true) });
});

router.delete("/admin/restaurants/:id", requireAuth, (req, res) => {
  if (!requireSuper(req, res)) return;
  const id = String(req.params.id);
  const assigned = db.prepare("SELECT COUNT(*) AS n FROM users WHERE location_id = ?").get(id);
  if (assigned && Number(assigned.n) > 0) {
    return res.status(400).json({ error: "Suppression refusée : un compte est rattaché à ce restaurant." });
  }
  const existing = db.prepare("SELECT 1 FROM restaurants WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Restaurant introuvable." });
  const tx = db.transaction(() => {
    removeBlockEntry(id);
    purgeRestaurantBlocks(id);
    db.prepare("DELETE FROM restaurants WHERE id = ?").run(id);
  });
  try {
    tx();
  } catch (e) {
    console.error("[restaurants] suppression impossible", e && e.message);
    return res.status(500).json({ error: "Suppression impossible." });
  }
  audit(req.user, "restaurant.delete", null, id, `Restaurant ${id} supprimé (table + blocs)`);
  res.status(204).end();
});

/* ── Admin : plats (admin = son resto, super_admin = tous) ─────────────── */

function resolveCreateLocation(user, requested) {
  const role = (user && user.role) || "admin";
  if (role === "super_admin") return { ok: true, locationId: requested || null };
  if (role === "developer") {
    return { ok: false, error: "Accès lecture seule (rôle technique)." };
  }
  const own = user && user.location_id ? String(user.location_id) : null;
  if (!own) return { ok: false, error: "Compte non rattaché à un restaurant." };
  if (requested && requested !== own) return { ok: false, error: "Accès refusé à ce restaurant." };
  return { ok: true, locationId: own };
}

router.get("/admin/plats", requireAuth, (req, res) => {
  const role = (req.user && req.user.role) || "admin";
  let rows;
  if (role === "admin") {
    const own = req.user.location_id ? String(req.user.location_id) : null;
    if (!own) return res.status(403).json({ error: "Compte non rattaché à un restaurant." });
    rows = db.prepare("SELECT * FROM plats WHERE location_id = ? ORDER BY category, name").all(own);
  } else {
    // Super admin/developer : filtre libre. Admin : forcé sur son restaurant.
    let loc = req.query.location ? String(req.query.location) : null;
    if (role === "admin") loc = req.user.location_id ? String(req.user.location_id) : null;
    if (role === "admin" && !loc) return res.status(403).json({ error: "Compte non rattaché à un restaurant." });
    rows = loc
      ? db.prepare("SELECT * FROM plats WHERE location_id = ? ORDER BY category, name").all(loc)
      : db.prepare("SELECT * FROM plats ORDER BY location_id, category, name").all();
  }
  res.json({ plats: rows.map(toPlat) });
});

router.post("/admin/plats", requireAuth, (req, res) => {
  const parsed = platInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Données invalides." });
  const d = parsed.data;
  const scoped = resolveCreateLocation(req.user, d.locationId);
  if (!scoped.ok) return res.status(403).json({ error: scoped.error });
  const resto = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(scoped.locationId);
  if (!resto) return res.status(400).json({ error: "Restaurant inconnu." });
  const cat = db.prepare("SELECT * FROM categories WHERE id = ? AND location_id = ? AND active = 1").get(d.category, scoped.locationId);
  if (!cat) return res.status(400).json({ error: `Catégorie inconnue pour ce restaurant : ${d.category}` });
  try {
    db.prepare(
      "INSERT INTO plats (id, name, description, price, category, price_from, image, location_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(d.id, d.name, d.description || "", d.price, d.category, d.priceFrom ? 1 : 0, d.image || "", scoped.locationId);
  } catch (e) {
    if (e && (e.code === "SQLITE_CONSTRAINT_PRIMARYKEY" || e.code === "SQLITE_CONSTRAINT_UNIQUE")) {
      return res.status(409).json({ error: "Un plat avec cet identifiant existe déjà." });
    }
    throw e;
  }
  audit(req.user, "plat.create", null, scoped.locationId, `Plat ${d.id} ajouté à ${scoped.locationId}`);
  res.status(201).json({ plat: toPlat(db.prepare("SELECT * FROM plats WHERE id = ?").get(d.id)) });
});

router.patch("/admin/plats/:id", requireAuth, (req, res) => {
  const id = String(req.params.id);
  const existing = db.prepare("SELECT * FROM plats WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Plat introuvable." });
  const role = (req.user && req.user.role) || "admin";
  const own = req.user.location_id ? String(req.user.location_id) : null;
  if (role === "developer") {
    return res.status(403).json({ error: "Accès lecture seule (rôle technique)." });
  }
  if (role === "admin" && existing.location_id !== own) {
    audit(req.user, "plat.denied", null, existing.location_id, `PATCH plat ${id} refusé`);
    return res.status(403).json({ error: "Accès refusé à ce plat." });
  }
  const body = req.body || {};
  const locMove = body.locationId !== undefined && role !== "admin" ? String(body.locationId) : null;
  const nextLocation = locMove || existing.location_id;
  const nextCategory =
    body.category !== undefined ? String(body.category) : existing.category;
  // La catégorie est validée pour le restaurant cible (avant ou après déplacement).
  if (body.category !== undefined) {
    const cat = db.prepare("SELECT * FROM categories WHERE id = ? AND location_id = ? AND active = 1").get(nextCategory, nextLocation);
    if (!cat) return res.status(400).json({ error: `Catégorie inconnue pour ce restaurant : ${nextCategory}` });
  }
  const next = {
    name: body.name !== undefined ? String(body.name) : existing.name,
    description: body.description !== undefined ? String(body.description) : existing.description,
    price: body.price !== undefined ? Number(body.price) : Number(existing.price),
    category: nextCategory,
    price_from: body.priceFrom !== undefined ? (body.priceFrom ? 1 : 0) : Number(existing.price_from),
    image: body.image !== undefined ? String(body.image) : existing.image,
    location_id: nextLocation,
  };
  db.prepare(
    "UPDATE plats SET name = @name, description = @description, price = @price, category = @category, price_from = @price_from, image = @image, location_id = @location_id, updated_at = datetime('now') WHERE id = @id"
  ).run({ ...next, id });
  audit(req.user, "plat.update", null, nextLocation, `Plat ${id} modifié`);
  res.json({ plat: toPlat(db.prepare("SELECT * FROM plats WHERE id = ?").get(id)) });
});

router.delete("/admin/plats/:id", requireAuth, (req, res) => {
  const id = String(req.params.id);
  const existing = db.prepare("SELECT * FROM plats WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Plat introuvable." });
  const role = (req.user && req.user.role) || "admin";
  const own = req.user.location_id ? String(req.user.location_id) : null;
  if (role === "developer") {
    return res.status(403).json({ error: "Accès lecture seule (rôle technique)." });
  }
  if (role === "admin" && existing.location_id !== own) {
    audit(req.user, "plat.denied", null, existing.location_id, `DELETE plat ${id} refusé`);
    return res.status(403).json({ error: "Accès refusé à ce plat." });
  }
  db.prepare("DELETE FROM plats WHERE id = ?").run(id);
  audit(req.user, "plat.delete", null, existing.location_id, `Plat ${id} supprimé`);
  res.status(204).end();
});

module.exports = { router };
