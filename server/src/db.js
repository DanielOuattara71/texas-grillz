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
`);

/** Sessions expirees : purge au demarrage puis a chaque interrogation. */
db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();

module.exports = { db, file };
