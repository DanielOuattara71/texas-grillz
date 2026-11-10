/**
 * Contenu editable du site, un bloc par cle.
 *
 * Le site public lit `/api/content` (public, en lecture seule) ; l'admin ecrit
 * via `/api/admin/content/:key` (session requise). Le contenu est un JSON
 * valide par cle : la forme exacte est verifiee par l'admin et par
 * `npm run check:media`, pas ici — un schema par bloc dupliquerait les types
 * TypeScript deja presents dans `src/data/`.
 *
 * Un siege (branche) peut disposer de ses propres blocs : `<locationId>:<base>`
 * (ex. `lyon-3:menu`). La lecture publique `?location=<id>` resserve le contenu
 * de ce siege, avec la surcharge du siege qui prime sur le contenu global.
 */
const express = require("express");
const { z } = require("zod");
const { db } = require("./db");
const { requireAuth } = require("./routes-auth");
const { validateBlock } = require("./schemas");

const router = express.Router();

/** Blocs connus : un contenu hors liste ne peut pas etre ecrit. */
const KEYS = [
  "site",
  "hours",
  "menu",
  "cravings",
  "categories",
  "filters",
  "locations",
  "services",
  "testimonials",
  "proofs",
  "texts",
  "historyTexts",
  "visuals",
  "gallery",
];

/** Cle de contenu d'un siege (`<locationId>:<base>`) ou globale (`<base>`). */
const locationOf = (key) => {
  const text = String(key);
  const index = text.indexOf(":");
  return index > 0 ? text.slice(0, index) : null;
};

const baseOf = (key) => {
  const text = String(key);
  const index = text.indexOf(":");
  return index > 0 ? text.slice(index + 1) : text;
};

const isContentKey = (value) => {
  const key = String(value);
  if (KEYS.includes(key)) return true;
  const location = locationOf(key);
  const base = baseOf(key);
  return Boolean(location) && KEYS.includes(base) && location.length <= 60;
};

const write = db.prepare(
  `INSERT INTO content (key, payload, updated_at) VALUES (?, ?, datetime('now'))
   ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`
);
const readAll = db.prepare("SELECT key, payload, updated_at FROM content");

/* ── Public : le site lit le contenu sans authentification ──────────────── */

router.get("/content", (req, res) => {
  const requested = typeof req.query.location === "string" ? req.query.location.trim() : "";
  const location = requested || null;

  const out = {};
  const scoped = {};
  const byLocation = {};

  for (const row of readAll.all()) {
    const base = baseOf(row.key);
    let value;
    try {
      value = JSON.parse(row.payload);
    } catch {
      // Un JSON corrompu ne doit pas casser tout le site : on l'ignore et
      // l'admin le voit via `/api/admin/content`.
      value = null;
    }
    const rowLocation = locationOf(row.key);
    const isGlobal = rowLocation === null;

    if (!isGlobal && (base === "menu" || base === "hours")) {
      byLocation[rowLocation] = byLocation[rowLocation] || {};
      byLocation[rowLocation][base] = value;
    }

    if (location) {
      /* Un siege est demande : on ne garde que ses blocs (`<location>:<base>`),
       * exposes sous la cle de base du bloc, avec la surcharge du siege qui
       * prime sur le contenu global. */
      if (!isGlobal && rowLocation !== location) continue;
      if (isGlobal) out[base] = value;
      else scoped[base] = value;
    } else if (isGlobal) {
      out[base] = value;
    }
  }

  const payload = location ? { ...out, ...scoped } : out;

  // On n'expose que les restaurants actifs, quand la liste est connue.
  let activeByLocation = byLocation;
  try {
    const locRow = db.prepare("SELECT payload FROM content WHERE key = ?").get("locations");
    if (locRow) {
      const list = JSON.parse(locRow.payload);
      if (Array.isArray(list)) {
        const active = new Set(list.filter((e) => e && e.active !== false && e.status !== "bientot").map((e) => e.id));
        activeByLocation = {};
        for (const [id, v] of Object.entries(byLocation)) {
          if (active.size === 0 || active.has(id)) activeByLocation[id] = v;
        }
      }
    }
  } catch {}
  payload.byLocation = activeByLocation;

  /* Les horaires du siege (`<location>:hours`) sont rattaches au siege
   * demande : c'est ce perimetre que le site public resolut via
   * `locationHours`. */
  if (location) {
    payload.locationHours = {
      ...(typeof out.locationHours === "object" && out.locationHours !== null
        ? out.locationHours
        : {}),
      [location]: scoped.hours ?? out.hours,
    };
  }

  res.json(payload);
});

/* ── Admin : lecture et ecriture, session requise ───────────────────────── */

router.get("/admin/content", requireAuth, (req, res) => {
  const { ownLocation } = require("./permissions");
  const role = (req.user && req.user.role) || "admin";
  const out = {};
  for (const row of readAll.all()) {
    if (role === "admin") {
      const own = ownLocation(req.user);
      if (!own || locationOf(row.key) !== own) continue;
    }
    try {
      out[row.key] = { payload: JSON.parse(row.payload), updatedAt: row.updated_at };
    } catch {
      continue;
    }
  }
  res.json(out);
});

const body = z.object({ payload: z.unknown() });

router.put("/admin/content/:key", requireAuth, (req, res) => {
  const key = String(req.params.key);
  if (!isContentKey(key)) {
    return res.status(400).json({ error: `Bloc de contenu inconnu : ${key}` });
  }

  const parsed = body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Charge utile invalide." });
  }

  /**
   * Le contenu est valide avant d'etre ecrit : un plat sans titre, avec un
   * prix negatif ou une URL d'image cassee est refuse ici. Sans cette garde,
   * l'erreur n'apparaitrait que sur le site public, sous forme d'un cadre
   * vide ou d'un « NaN € ».
   */
  const checked = validateBlock(baseOf(key), parsed.data.payload);
  if (!checked.ok) {
    return res.status(422).json({ error: checked.error });
  }

  let payload;
  try {
    payload = JSON.stringify(checked.data);
  } catch {
    return res.status(400).json({ error: "Contenu non serialisable." });
  }
  if (payload === undefined) {
    return res.status(400).json({ error: "Contenu vide." });
  }

  const { canWriteContent } = require("./permissions");
  const { audit } = require("./audit");
  const allowed = canWriteContent(req.user, key);
  if (!allowed.ok) {
    audit(req.user, "content.denied", key, locationOf(key), `Écriture refusée ${key} : ${allowed.error || "Accès refusé."}`);
    return res.status(403).json({ error: allowed.error || "Accès refusé." });
  }
  write.run(key, payload);
  const loc = locationOf(key);
  audit(req.user, "content.put", key, loc, `Contenu ${key} mis à jour`);
  res.json({ key, updatedAt: new Date().toISOString() });
});

/**
 * Suppression du contenu d'un siege (super admin) : tous les blocs publies
 * pour ce lieu (`<locationId>:<base>`), sans toucher au contenu global.
 */
router.delete("/admin/locations/:locationId/content", requireAuth, (req, res) => {
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ error: "Super admin requis." });
  }
  const locationId = String(req.params.locationId || "");
  if (!locationId || locationId.length > 60) {
    return res.status(400).json({ error: "Identifiant de siege invalide." });
  }
  const result = db.prepare("DELETE FROM content WHERE key LIKE ?").run(`${locationId}:%`);
  const { audit } = require("./audit");
  audit(req.user, "content.delete-location", locationId, locationId, `Contenu du siège ${locationId} supprimé (${result.changes} bloc(s))`);
  res.json({ deleted: result.changes });
});

module.exports = { router, CONTENT_KEYS: KEYS };
