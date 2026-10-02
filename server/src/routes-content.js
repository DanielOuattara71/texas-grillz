/**
 * Contenu editable du site, un bloc par cle.
 *
 * Le site public lit `/api/content` (public, en lecture seule) ; l'admin ecrit
 * via `/api/admin/content/:key` (session requise). Le contenu est un JSON
 * valide par cle : la forme exacte est verifiee par l'admin et par
 * `npm run check:media`, pas ici — un schema par bloc dupliquerait les types
 * TypeScript deja presents dans `src/data/`.
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

const isContentKey = (value) => KEYS.includes(value);

const write = db.prepare(
  `INSERT INTO content (key, payload, updated_at) VALUES (?, ?, datetime('now'))
   ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`
);
const readAll = db.prepare("SELECT key, payload, updated_at FROM content");

/* ── Public : le site lit le contenu sans authentification ──────────────── */

router.get("/content", (_req, res) => {
  const out = {};
  for (const row of readAll.all()) {
    try {
      out[row.key] = JSON.parse(row.payload);
    } catch {
      // Un JSON corrompu ne doit pas casser tout le site : on l'ignore et
      // l'admin le voit via `/api/admin/content`.
      out[row.key] = null;
    }
  }
  res.json(out);
});

/* ── Admin : lecture et ecriture, session requise ───────────────────────── */

router.get("/admin/content", requireAuth, (_req, res) => {
  const out = {};
  for (const row of readAll.all()) {
    out[row.key] = { payload: JSON.parse(row.payload), updatedAt: row.updated_at };
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
  const checked = validateBlock(key, parsed.data.payload);
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

  write.run(key, payload);
  res.json({ key, updatedAt: new Date().toISOString() });
});

module.exports = { router, CONTENT_KEYS: KEYS };
