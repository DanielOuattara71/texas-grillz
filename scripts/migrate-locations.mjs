/**
 * Migration des données — prompt 2 §9.
 *
 * Crée les restaurants du prompt 1, copie le menu commun vers <id>:menu
 * et les horaires vers <id>:hours. Sauvegarde préalable de la base.
 *
 * Usage : node scripts/migrate-locations.mjs [--db chemin]
 * Ne pas exécuter sans sauvegarde préalable.
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

const LOCATIONS = [
  { id: "zone-4", number: "01", name: "Texas GrillZ — Marcory Zone 4", address: "Rue Lumière, en face du Cours Sévigné, Zone 4 C, Marcory", phone: "07 77 47 37 37", image: "/images/locations/zone-4.jpg", mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=5.3485583%2C-3.9769516", active: true },
  { id: "riviera-jardin", number: "02", name: "Texas GrillZ — Riviera Jardin", address: "Riviera Jardin, Cocody", phone: "07 77 59 59 47", image: "/images/locations/riviera-jardin.jpg", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Texas+GrillZ+Riviera+Jardin+Abidjan", active: true },
  { id: "deux-plateaux-latrille", number: "03", name: "Texas GrillZ — Deux-Plateaux Latrille", address: "Deux-Plateaux, Boulevard Latrille, Cocody", phone: "07 77 59 59 47", image: "/images/locations/deux-plateaux-latrille.jpg", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Texas+GrillZ+Deux+Plateaux+Latrille", active: true },
  { id: "yopougon-maroc", number: "04", name: "Texas GrillZ — Yopougon Maroc", address: "Carrefour Canaris (antenne), Yopougon Maroc", phone: "07 77 45 00 00", image: "/images/locations/yopougon-maroc.jpg", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Texas+GrillZ+Yopougon+Maroc", active: true },
  { id: "cocody-cite-des-arts", number: "05", name: "Texas GrillZ — Cocody Cité des Arts", address: "Cocody Cité des Arts", phone: "07 77 59 59 47", image: "/images/locations/cocody-cite-des-arts.jpg", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Texas+GrillZ+Cocody+Cit%C3%A9+des+Arts", active: true },
];

const DEFAULT_HOURS = [
  { open: "12:00", close: "24:00" },
  { open: "12:00", close: "23:30" },
  { open: "12:00", close: "23:30" },
  { open: "12:00", close: "23:30" },
  { open: "12:00", close: "23:30" },
  { open: "12:00", close: "24:00" },
  { open: "12:00", close: "24:00" },
];

if (!fs.existsSync(dbPath)) {
  console.error(`Base introuvable : ${dbPath}`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(root, "scripts", "backups");
fs.mkdirSync(backupDir, { recursive: true });
const backup = path.join(backupDir, `tg-backup-${stamp}.sqlite`);
fs.copyFileSync(dbPath, backup);
console.log(`Sauvegarde : ${backup}`);

const Database = (await import("better-sqlite3")).default;
const db = new Database(dbPath);

const upsert = db.prepare(
  "INSERT INTO content (key, payload, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at"
);
const get = db.prepare("SELECT payload FROM content WHERE key = ?");

const existing = (() => {
  const row = get.get("locations");
  if (!row) return [];
  try {
    const v = JSON.parse(row.payload);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
})();

const merged = [...existing];
for (const loc of LOCATIONS) {
  if (!merged.some((e) => e && e.id === loc.id)) merged.push(loc);
  const withSchedule = merged.find((e) => e && e.id === loc.id);
  if (withSchedule && !withSchedule.schedule) withSchedule.schedule = DEFAULT_HOURS;
}
upsert.run("locations", JSON.stringify(merged));

const commonMenu = (() => {
  const row = get.get("menu");
  if (!row) return null;
  try {
    return JSON.parse(row.payload);
  } catch {
    return null;
  }
})();

for (const loc of LOCATIONS) {
  if (commonMenu !== null && get.get(`${loc.id}:menu`) === undefined) {
    upsert.run(`${loc.id}:menu`, JSON.stringify(commonMenu));
  }
  if (get.get(`${loc.id}:hours`) === undefined) {
    upsert.run(`${loc.id}:hours`, JSON.stringify(DEFAULT_HOURS));
  }
}

console.log(`Migration terminée : ${merged.length} restaurant(s), menus/horaires copiés sans écrasement.`);
db.close();
