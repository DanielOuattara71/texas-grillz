/**
 * Comptes admin — super_admin uniquement.
 *
 * Créer / modifier / désactiver / supprimer, changer de restaurant,
 * réinitialiser un mot de passe (affiché une seule fois).
 */
const crypto = require("node:crypto");
const express = require("express");
const { z } = require("zod");
const { db } = require("./db");
const { requireAuth } = require("./routes-auth");
const { hashPassword } = require("./auth");
const { audit } = require("./audit");

const router = express.Router();

function requireSuper(req, res) {
  if (!req.user || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Super admin requis." });
    return false;
  }
  return true;
}

function knownLocationIds() {
  try {
    const row = db.prepare("SELECT payload FROM content WHERE key = ?").get("locations");
    if (!row) return null;
    const list = JSON.parse(row.payload);
    return Array.isArray(list) ? list.map((e) => e && e.id).filter(Boolean) : null;
  } catch {
    return null;
  }
}

const userSchema = z.object({
  email: z.string().email("Adresse email invalide.").max(200),
  name: z.string().trim().min(1, "Nom requis.").max(120),
  role: z.enum(["admin", "super_admin", "developer"]),
  location_id: z.string().max(60).nullable().optional(),
  phone: z.string().max(40).optional().or(z.literal("")),
});

function validateLocation(user, role, locationId, excludeUserId = null) {
  const known = knownLocationIds();
  // Accepté aussi depuis la table Restaurants.
  let knownAll = known;
  try {
    const tableIds = db.prepare("SELECT id FROM restaurants").all().map((r) => r.id);
    if (tableIds.length > 0) {
      knownAll = knownAll ? [...new Set([...knownAll, ...tableIds])] : tableIds;
    }
  } catch {}
  if (role === "admin") {
    if (!locationId) return "Un restaurant est requis pour un admin.";
    if (knownAll && !knownAll.includes(locationId)) return "Restaurant inconnu.";
    // 1 restaurant = 1 seul admin.
    const taken = db
      .prepare("SELECT id FROM users WHERE location_id = ? AND role = 'admin' AND active != 0 AND (? IS NULL OR id != ?)")
      .get(locationId, excludeUserId, excludeUserId);
    if (taken) return "Un admin est déjà rattaché à ce restaurant.";
  } else if (locationId) {
    // super_admin / developer : restaurant optionnel, mais doit exister si fourni.
    if (knownAll && !knownAll.includes(locationId)) return "Restaurant inconnu.";
  }
  return null;
}

function countSuper() {
  const row = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'super_admin' AND active != 0").get();
  return row ? Number(row.n) : 0;
}

function toPublic(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "admin",
    location_id: user.location_id || null,
    phone: user.phone || "",
    active: user.active === undefined ? 1 : Number(user.active),
    must_change_password: Boolean(Number(user.must_change_password || 0)),
    created_at: user.created_at || null,
    last_login_at: user.last_login_at || null,
  };
}

router.get("/admin/users", requireAuth, (req, res) => {
  if (!requireSuper(req, res)) return;
  const rows = db
    .prepare(
      "SELECT id, email, name, role, location_id, active, must_change_password, created_at, last_login_at FROM users ORDER BY id"
    )
    .all();
  res.json({ users: rows.map(toPublic) });
});

router.post("/admin/users", requireAuth, (req, res) => {
  if (!requireSuper(req, res)) return;
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Données invalides." });
  }
  const { email, name, role, location_id, phone } = parsed.data;
  const err = validateLocation(req.user, role, location_id || null);
  if (err) return res.status(400).json({ error: err });

  // Mot de passe temporaire lisible, affiché une seule fois.
  const temp = `Tg-${crypto.randomBytes(6).toString("hex")}-!`;
  const hash = hashPassword(temp);
  try {
    const info = db
      .prepare(
        "INSERT INTO users (email, name, password_hash, location_id, phone, role, active, must_change_password, created_by) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)"
      )
      .run(email.trim().toLowerCase(), name, hash, location_id || null, phone || "", role, req.user.id);
    const created = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    audit(req.user, "user.create", null, location_id || null, `Compte ${email} créé (${role})`);
    return res.status(201).json({ user: toPublic(created), temporaryPassword: temp });
  } catch (e) {
    if (e && e.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Cet email existe déjà." });
    }
    throw e;
  }
});

router.patch("/admin/users/:id", requireAuth, (req, res) => {
  if (!requireSuper(req, res)) return;
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Compte introuvable." });

  const body = req.body || {};
  const role = body.role !== undefined ? body.role : existing.role;
  const locationId = body.location_id !== undefined ? body.location_id : existing.location_id;
  const name = body.name !== undefined ? String(body.name).trim() : existing.name;
  const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : existing.email;
  const phone = body.phone !== undefined ? String(body.phone).trim() : (existing.phone || "");
  const active = body.active !== undefined ? (body.active ? 1 : 0) : Number(existing.active ?? 1);

  if (!z.string().email().safeParse(email).success) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }
  if (!["admin", "super_admin", "developer"].includes(role)) {
    return res.status(400).json({ error: "Rôle invalide." });
  }
  const locErr = validateLocation(req.user, role, locationId || null, id);
  if (locErr) return res.status(400).json({ error: locErr });

  // Ne jamais perdre le dernier super_admin actif.
  const wasSuperActive = existing.role === "super_admin" && Number(existing.active ?? 1) === 1;
  const willBeSuperActive = role === "super_admin" && active === 1;
  if (wasSuperActive && !willBeSuperActive && countSuper() <= 1) {
    return res.status(400).json({ error: "Impossible de rétrograder ou désactiver le dernier super admin." });
  }

  try {
    db.prepare(
      "UPDATE users SET email = ?, name = ?, phone = ?, role = ?, location_id = ?, active = ? WHERE id = ?"
    ).run(email, name, phone, role, locationId || null, active, id);
  } catch (e) {
    if (e && e.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Cet email existe déjà." });
    }
    throw e;
  }
  if (active === 0) {
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  }
  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  audit(req.user, "user.update", null, locationId || null, `Compte ${email} modifié (${role}, actif=${active})`);
  res.json({ user: toPublic(updated) });
});

router.delete("/admin/users/:id", requireAuth, (req, res) => {
  if (!requireSuper(req, res)) return;
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Compte introuvable." });
  if (Number(existing.id) === Number(req.user.id)) {
    return res.status(400).json({ error: "Impossible de supprimer son propre compte." });
  }
  if (existing.role === "super_admin" && countSuper() <= 1) {
    return res.status(400).json({ error: "Impossible de supprimer le dernier super admin." });
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  audit(req.user, "user.delete", null, existing.location_id || null, `Compte ${existing.email} supprimé`);
  res.status(204).end();
});

router.post("/admin/users/:id/reset-password", requireAuth, (req, res) => {
  if (!requireSuper(req, res)) return;
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Compte introuvable." });
  const temp = `Tg-${crypto.randomBytes(6).toString("hex")}-!`;
  const hash = hashPassword(temp);
  db.prepare(
    "UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?"
  ).run(hash, id);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  audit(req.user, "user.reset-password", null, existing.location_id || null, `Mot de passe réinitialisé pour ${existing.email}`);
  res.json({ temporaryPassword: temp });
});

module.exports = { router };
