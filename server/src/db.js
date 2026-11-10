/**
 * Connexion a SQLite + creation du schema.
 *
 * La base est un simple fichier (`data/tg.sqlite`, ou la variable
 * `DATABASE_PATH`). Sur Railway/Render, ce chemin doit pointer vers un volume
 * persistant : le disque d'un conteneur ephemere est vide a chaque redemarrage.
 */
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const file = process.env.DATABASE_PATH || path.join(__dirname, "..", "data", "tg.sqlite");
fs.mkdirSync(path.dirname(file), { recursive: true });

const db = new Database(file);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

  -- Contenu editable du site, un bloc par cle (menu, locations, hours, ...).
  -- 'payload' est le JSON produit par l'admin ; le site public le lit au rendu.
  CREATE TABLE IF NOT EXISTS content (
    key        TEXT PRIMARY KEY,
    payload    TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Demandes de reservation envoyées par le site public.
  CREATE TABLE IF NOT EXISTS reservations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    phone      TEXT,
    date       TEXT NOT NULL,
    guests     TEXT NOT NULL,
    message    TEXT,
    status     TEXT NOT NULL DEFAULT 'nouvelle',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
  CREATE INDEX IF NOT EXISTS idx_reservations_created ON reservations(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);

  CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER,
    action      TEXT NOT NULL,
    key         TEXT,
    location_id TEXT,
    summary     TEXT,
    at          TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);

  -- Entité Restaurant : une adresse de la chaîne.
  CREATE TABLE IF NOT EXISTS restaurants (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    email       TEXT NOT NULL DEFAULT '',
    address     TEXT NOT NULL DEFAULT '',
    phone       TEXT NOT NULL DEFAULT '',
    image       TEXT NOT NULL DEFAULT '',
    maps_url    TEXT NOT NULL DEFAULT '',
    active      INTEGER NOT NULL DEFAULT 1,
    published   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Entité Catégorie : par restaurant (8 catégories livrées par resto, puis admin gère les siennes).
  CREATE TABLE IF NOT EXISTS categories (
    id          TEXT NOT NULL,
    location_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    label       TEXT NOT NULL,
    note        TEXT NOT NULL DEFAULT '',
    sort        INTEGER NOT NULL DEFAULT 0,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (location_id, id)
  );

  -- Entité Plat : toujours rattaché à un seul Restaurant (restoID).
  CREATE TABLE IF NOT EXISTS plats (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price       INTEGER NOT NULL,
    category    TEXT NOT NULL,
    price_from  INTEGER NOT NULL DEFAULT 0,
    image       TEXT NOT NULL DEFAULT '',
    location_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_plats_location ON plats(location_id);
  CREATE INDEX IF NOT EXISTS idx_plats_category ON plats(location_id, category);
`);

/**
 * Colonnes ajoutees par la refonte multi-seances : appliquees de maniere
 * idempotente (les bases fraîches creent les colonnes via le CREATE ci-dessus,
 * les bases existantes passent par ALTER).
 */
const addColumnIfMissing = (table, column, definition) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};
addColumnIfMissing("reservations", "location_id", "TEXT");
addColumnIfMissing("reservations", "time", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("users", "location_id", "TEXT");
addColumnIfMissing("users", "role", "TEXT NOT NULL DEFAULT 'admin'");
addColumnIfMissing("users", "active", "INTEGER NOT NULL DEFAULT 1");
addColumnIfMissing("users", "must_change_password", "INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("users", "created_by", "INTEGER");
addColumnIfMissing("users", "last_login_at", "TEXT");
addColumnIfMissing("users", "phone", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("restaurants", "description", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("restaurants", "email", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("restaurants", "published", "INTEGER NOT NULL DEFAULT 1");

// Un restaurant est attribué à un et un seul admin (rôle admin).
try {
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_admin_location ON users(location_id) WHERE role = 'admin' AND location_id IS NOT NULL"
  );
} catch (err) {
  console.error("[db] contrainte 1 restaurant = 1 admin non créée :", err.message);
}

/** Sessions expirees : purge au demarrage puis a chaque interrogation. */
db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();

// Seed des catégories PAR RESTAURANT (chaque ligne du resto reçoit les 8; sans écrasement).
try {
  const restos = db.prepare("SELECT id FROM restaurants").all().map((r) => r.id);
  const seed = db.prepare(`INSERT OR IGNORE INTO categories (id, location_id, label, note, sort, active)
    VALUES (?, ?, ?, ?, ?, 1)`);
  const seedRows = [
    ["mix-grill", "Mix Grill", "Plateaux de viandes grillées à partager.", 1],
    ["saisonniers", "Saisonniers", "Suggestions du moment.", 2],
    ["bbq", "Viande BBQ", "Poulet texan, côtes de porc, steak et ribs, sauce secrète de la maison.", 3],
    ["burgers", "Burgers", "Les burgers maison.", 4],
    ["brochettes", "Brochettes", "Brochettes grillées, servies sans accompagnement.", 5],
    ["garnitures", "Garnitures", "Accompagnements à ajouter à votre plat.", 6],
    ["weekend", "Week-end Carnivore", "Menu du week-end. Accompagnement de base : attiéké.", 7],
    ["boissons", "Boissons", "Softs, bières, jus, liqueurs et vins.", 8],
  ];
  for (const rid of restos) for (const [id, label, note, sort] of seedRows) seed.run(id, rid, label, note, sort);
} catch (err) {
  console.error("[db] seed categories par resto", err.message);
}

module.exports = { db, file };
