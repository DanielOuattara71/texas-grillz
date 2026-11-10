/**
 * Migration additive : heure souhaitée de réservation (`time`).
 * Sauvegarde complète avant application. Idempotent.
 * Usage : node scripts/migrate-reservation-time.mjs [--db chemin]
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
const backup = path.join(root, "scripts", "backups", `tg-pre-reservation-time-${stamp}.sqlite`);
fs.mkdirSync(path.dirname(backup), { recursive: true });
fs.copyFileSync(dbPath, backup);
console.log(`Sauvegarde : ${backup}`);

const Database = (await import(path.join(root, "server", "node_modules", "better-sqlite3", "lib", "index.js"))).default;
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
const tx = db.transaction(() => {
  const cols = db.prepare("PRAGMA table_info(reservations)").all().map((c) => c.name);
  if (!cols.includes("time")) {
    db.exec("ALTER TABLE reservations ADD COLUMN time TEXT NOT NULL DEFAULT ''");
    console.log("+ reservations.time");
  } else {
    console.log("= reservations.time déjà présente");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date)");
});
tx();
db.close();
console.log("OK");
