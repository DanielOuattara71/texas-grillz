/**
 * Migration vers la table `categories` et FK `plats.category`.
 * Sauvegarde d'abord. Immuable si déjà migrée.
 * Usage : node scripts/migrate-categories-table.mjs [--db chemin]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dbIndex = args.indexOf("--db");
const dbPath =
  dbIndex >= 0 && args[dbIndex + 1]
    ? path.resolve(args[dbIndex + 1])
    : process.env.DATABASE_PATH
      ? path.resolve(process.env.DATABASE_PATH)
      : path.join(root, "server", "data", "tg.sqlite");

if (!fs.existsSync(dbPath)) {
  console.error(`Base introuvable : ${dbPath}`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(root, "scripts", "backups");
fs.mkdirSync(backupDir, { recursive: true });
const backup = path.join(backupDir, `tg-pre-categories-${stamp}.sqlite`);
fs.copyFileSync(dbPath, backup);
console.log(`Sauvegarde : ${backup}`);

const Database = (await import(path.join(root, "server", "node_modules", "better-sqlite3", "lib", "index.js"))).default;
const db = new Database(dbPath);
db.pragma("foreign_keys = OFF");

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
if (tables.includes("categories")) {
  const fks = db.prepare("PRAGMA foreign_key_list('plats')").all();
  if (fks.some((f) => f.table === "categories")) {
    console.log("Déjà migré (categories + FK) — rien à faire.");
    db.close();
    process.exit(0);
  }
}

// Catégories réelles (mêmes id que src/data/menu.ts).
db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  sort       INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);
const seed = db.prepare("INSERT OR IGNORE INTO categories (id, label, note, sort, active) VALUES (?, ?, ?, ?, 1)");
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
for (const r of rows) seed.run(...r);
console.log("Catégories seedées.");

// Rebuild plats : la FK category → categories.
db.exec("ALTER TABLE plats RENAME TO plats_old");
db.exec(`CREATE TABLE plats (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price       INTEGER NOT NULL,
  category    TEXT NOT NULL REFERENCES categories(id),
  price_from  INTEGER NOT NULL DEFAULT 0,
  image       TEXT NOT NULL DEFAULT '',
  location_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
)`);
db.exec("CREATE INDEX IF NOT EXISTS idx_plats_location ON plats(location_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_plats_category ON plats(category)");
db.exec(`INSERT INTO plats (id, name, description, price, category, price_from, image, location_id, created_at, updated_at)
         SELECT id, name, description, price, category, price_from, image, location_id, created_at, updated_at
         FROM plats_old`);
db.exec("DROP TABLE plats_old");
db.pragma("foreign_keys = ON");
console.log("Plats reconstruits avec FK category → categories.");

const count = db.prepare("SELECT COUNT(*) AS n FROM plats").get();
console.log(`OK : ${count.n} plats, ${db.prepare("SELECT COUNT(*) AS n FROM categories").get().n} catégories.`);
db.close();
