/**
 * Réinitialise le contenu enregistré côté backend.
 *
 * Le store lit `GET /api/content` et ses valeurs écrasent `src/data`.
 * Pour retomber sur les données livrées (`src/data/*.ts`), ce script
 * sauvegarde d'abord l'existant dans un fichier daté, puis supprime
 * les clés de contenu de la table `content`.
 *
 * Usage : node scripts/reset-content.mjs [--db chemin]
 * Le chemin par défaut suit `DATABASE_PATH` ou `server/data/tg.sqlite`.
 *
 * Ne pas exécuter sans confirmation explicite.
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

const KEYS = [
  "menu",
  "locations",
  "site",
  "hours",
  "texts",
  "historyTexts",
  "testimonials",
  "cravings",
  "proofs",
  "services",
  "visuals",
  "gallery",
  "navLinks",
  "locationHours",
];

if (!fs.existsSync(dbPath)) {
  console.error(`Base introuvable : ${dbPath}`);
  process.exit(1);
}

const Database = (await import("better-sqlite3")).default;
const db = new Database(dbPath);
const rows = db.prepare("SELECT key, payload, updated_at FROM content").all();

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(root, "scripts", "backups");
fs.mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `content-backup-${stamp}.json`);
fs.writeFileSync(backupPath, JSON.stringify(rows, null, 2));
console.log(`Sauvegarde : ${backupPath} (${rows.length} bloc(s))`);

const targets = rows.filter((row) => {
  const base = row.key.includes(":") ? row.key.split(":").pop() : row.key;
  return KEYS.includes(base) || KEYS.includes(row.key);
});

const del = db.prepare("DELETE FROM content WHERE key = ?");
for (const row of targets) {
  del.run(row.key);
}
console.log(`Supprimé : ${targets.length} bloc(s). Le site retombe sur src/data.`);
db.close();
