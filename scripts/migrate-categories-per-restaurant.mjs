/**
 * Migration catégories PAR RESTAURANT.
 * Sauvegarde → rebuild `categories` (pk restaurant_id+name, seed livrées par resto)
 * → rebuild `plats` avec FK restaurant/categorie. Immuable si déjà ok.
 * Usage : node scripts/migrate-categories-per-restaurant.mjs [--db chemin]
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
const backup = path.join(root, "scripts", "backups", `tg-per-resto-cats-${stamp}.sqlite`);
fs.mkdirSync(path.dirname(backup), { recursive: true });
fs.copyFileSync(dbPath, backup);
console.log(`Sauvegarde : ${backup}`);

const Database = (await import(path.join(root, "server", "node_modules", "better-sqlite3", "lib", "index.js"))).default;
const db = new Database(dbPath);
db.pragma("foreign_keys = OFF");

const existing = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'").all();
let oldAcross = false;
if (existing.length) {
  const withResto = db.prepare("PRAGMA table_info('categories')").all().some((c) => c.name === "location_id");
  if (!withResto) oldAcross = true;
}
if (!oldAcross) {
  console.log("Catégories déjà par restaurant — rien à faire.");
  db.close();
  process.exit(0);
}

const restaurants = db.prepare("SELECT id FROM restaurants").all().map((r) => r.id);
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

db.exec("DROP TABLE IF EXISTS plats_old");
db.exec("ALTER TABLE plats RENAME TO plats_old");
db.exec("DROP TABLE IF EXISTS categories_old");
db.exec("ALTER TABLE categories RENAME TO categories_old");
db.exec(`CREATE TABLE categories (
  id          TEXT NOT NULL,
  location_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  sort        INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (location_id, id)
)`);
db.exec("CREATE INDEX IF NOT EXISTS idx_categories_location ON categories(location_id)");
const insCat = db.prepare("INSERT INTO categories (id, location_id, label, note, sort, active) VALUES (?, ?, ?, ?, ?, ?)");
for (const rid of restaurants) {
  for (const [id, label, note, sort] of seedRows) insCat.run(id, rid, label, note, sort, 1);
}
// Rebuild plats : category → reste id local, la FK est composite.
db.exec(`CREATE TABLE plats (
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
)`);
db.exec("CREATE INDEX IF NOT EXISTS idx_plats_location ON plats(location_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_plats_category ON plats(location_id, category)");
db.exec(`INSERT INTO plats (id, name, description, price, category, price_from, image, location_id, created_at, updated_at)
         SELECT id, name, description, price, category, price_from, image, location_id, created_at, updated_at FROM plats_old`);
db.exec("DROP TABLE plats_old");
db.exec("DROP TABLE categories_old");
db.pragma("foreign_keys = ON");
console.log(`OK : ${db.prepare("SELECT COUNT(*) AS n FROM categories").get().n} catégories (par resto), ${db.prepare("SELECT COUNT(*) AS n FROM plats").get().n} plats.`);
db.close();
