/**
 * Migration additive : champs restaurant/admin attendus par la centralisation.
 * Sauvegarde complète de la base avant application. Idempotent (PRAGMA checks).
 * Usage : node scripts/migrate-restaurant-fields.mjs [--db chemin]
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
const backup = path.join(root, "scripts", "backups", `tg-pre-resto-fields-${stamp}.sqlite`);
fs.mkdirSync(path.dirname(backup), { recursive: true });
fs.copyFileSync(dbPath, backup);
console.log(`Sauvegarde : ${backup}`);

const Database = (await import(path.join(root, "server", "node_modules", "better-sqlite3", "lib", "index.js"))).default;
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const addIfMissing = (table, column, definition) => {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (cols.some((c) => c.name === column)) {
    console.log(`= ${table}.${column} déjà présente`);
    return false;
  }
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`+ ${table}.${column}`);
  return true;
};

const tx = db.transaction(() => {
  addIfMissing("restaurants", "description", "TEXT NOT NULL DEFAULT ''");
  addIfMissing("restaurants", "email", "TEXT NOT NULL DEFAULT ''");
  addIfMissing("restaurants", "published", "INTEGER NOT NULL DEFAULT 1");
  addIfMissing("users", "phone", "TEXT NOT NULL DEFAULT ''");
});
tx();
db.close();
console.log("OK");
