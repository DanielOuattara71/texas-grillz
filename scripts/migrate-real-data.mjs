/**
 * Migration des données réelles — Restaurants + Plats + Comptes.
 *
 *   node scripts/migrate-real-data.mjs [--db chemin]
 *
 * - Sauvegarde la base avant.
 * - Crée la table restaurants depuis `src/data/locations.ts` (ids immuables).
 * - Importe les 65 plats de `src/data/menu.ts` comme plats réels pour CHAQUE
 *   restaurant actif (restoID = location_id).
 * - Crée un compte admin par restaurant (1 resto = 1 admin) + super_admin
 *   bootstrap (voir server/src/auth.js ensureBootstrapAdmin).
 * - Migration idempotente : un restaurant/plat/compte déjà présent est ignoré.
 * - Les mots de passe temporaires sont imprimés sur la sortie standard.
 *
 * Ne pas exécuter sans sauvegarde préalable.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

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
const backup = path.join(backupDir, `tg-pre-real-${stamp}.sqlite`);
fs.copyFileSync(dbPath, backup);
console.log(`Sauvegarde : ${backup}`);

// better-sqlite3 et bcryptjs vivent dans server/node_modules : import absolu.
const Database = (await import(path.join(root, "server", "node_modules", "better-sqlite3", "lib", "index.js"))).default;
const bcrypt = (await import(path.join(root, "server", "node_modules", "bcryptjs", "index.js"))).default;
const db = new Database(dbPath);

/* ── Table restaurants ─────────────────────────────────────────────────── */
db.exec(`CREATE TABLE IF NOT EXISTS restaurants (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  address    TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  image      TEXT NOT NULL DEFAULT '',
  maps_url   TEXT NOT NULL DEFAULT '',
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);
db.exec(`CREATE TABLE IF NOT EXISTS plats (
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
try {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_admin_location ON users(location_id) WHERE role = 'admin' AND location_id IS NOT NULL");
} catch (err) {
  console.log(`Index unique admin/resto déjà présent ou impossible : ${err.message}`);
}

// Colonnes users requises (miroir de server/src/db.js addColumnIfMissing).
const addColumnIfMissing = (table, column, definition) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
};
addColumnIfMissing("users", "location_id", "TEXT");
addColumnIfMissing("users", "role", "TEXT NOT NULL DEFAULT 'admin'");
addColumnIfMissing("users", "active", "INTEGER NOT NULL DEFAULT 1");
addColumnIfMissing("users", "must_change_password", "INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("users", "created_by", "INTEGER");
addColumnIfMissing("users", "last_login_at", "TEXT");

/* ── Restaurants réels (mêmes 5 que src/data/locations.ts) ────────────── */
const LOCATIONS = [
  { id: "zone-4", number: "01", name: "Texas GrillZ — Marcory Zone 4", address: "Rue Lumière, en face du Cours Sévigné, Zone 4 C, Marcory", phone: "07 77 47 37 37", image: "/images/locations/zone-4.jpg", mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=5.3485583%2C-3.9769516", active: true },
  { id: "riviera-jardin", number: "02", name: "Texas GrillZ — Riviera Jardin", address: "Riviera Jardin, Cocody", phone: "07 77 59 59 47", image: "/images/locations/riviera-jardin.jpg", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Texas+GrillZ+Riviera+Jardin+Abidjan", active: true },
  { id: "deux-plateaux-latrille", number: "03", name: "Texas GrillZ — Deux-Plateaux Latrille", address: "Deux-Plateaux, Boulevard Latrille, Cocody", phone: "07 77 59 59 47", image: "/images/locations/deux-plateaux-latrille.jpg", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Texas+GrillZ+Deux+Plateaux+Latrille", active: true },
  { id: "yopougon-maroc", number: "04", name: "Texas GrillZ — Yopougon Maroc", address: "Carrefour Canaris (antenne), Yopougon Maroc", phone: "07 77 45 00 00", image: "/images/locations/yopougon-maroc.jpg", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Texas+GrillZ+Yopougon+Maroc", active: true },
  { id: "cocody-cite-des-arts", number: "05", name: "Texas GrillZ — Cocody Cité des Arts", address: "Cocody Cité des Arts", phone: "07 77 59 59 47", image: "/images/locations/cocody-cite-des-arts.jpg", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Texas+GrillZ+Cocody+Cit%C3%A9+des+Arts", active: true },
];

const upsertRestaurant = db.prepare(`INSERT INTO restaurants (id, name, address, phone, image, maps_url, active)
  VALUES (@id, @name, @address, @phone, @image, @mapsUrl, @active)
  ON CONFLICT(id) DO UPDATE SET name = excluded.name, address = excluded.address, phone = excluded.phone, image = excluded.image, maps_url = excluded.maps_url, active = excluded.active, updated_at = datetime('now')`);
for (const loc of LOCATIONS) {
  upsertRestaurant.run({ ...loc, active: loc.active === false ? 0 : 1 });
}
console.log(`Restaurants : ${LOCATIONS.length} lignes.`);

/* ── Bloc content `locations` aligné avec la table ────────────────────── */
db.prepare(`INSERT INTO content (key, payload, updated_at) VALUES ('locations', ?, datetime('now'))
  ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`)
  .run(JSON.stringify(LOCATIONS));

/* ── Plats réels : parse src/data/menu.ts ─────────────────────────────── */
const menuFile = fs.readFileSync(path.join(root, "src", "data", "menu.ts"), "utf8");
const matches = [...menuFile.matchAll(/dish\("([^"]+)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*(\d+),\s*"([^"]+)"(?:,\s*\{([^}]*)\})?\)/g)];
const unescapeStr = (s) => s.replace(/\\u2019/g, "’").replace(/\\n/g, "\n").replace(/\\"/g, '"');
const parsed = matches.map((m) => {
  const extra = m[6] || "";
  return {
    id: m[1],
    name: unescapeStr(m[2]),
    description: unescapeStr(m[3]),
    price: Number(m[4]),
    category: m[5],
    priceFrom: /priceFrom:\s*true/.test(extra) ? 1 : 0,
    image: `/images/products/${m[1]}.svg`,
  };
});
if (parsed.length === 0) {
  console.error("Impossible de parser src/data/menu.ts (aucun plat détecté).");
  process.exit(1);
}
console.log(`Plats livrés détectés : ${parsed.length}`);

const upsertPlat = db.prepare(`INSERT INTO plats (id, name, description, price, category, price_from, image, location_id)
  VALUES (@id, @name, @description, @price, @category, @priceFrom, @image, @locationId)
  ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, price = excluded.price, category = excluded.category, price_from = excluded.price_from, image = excluded.image, updated_at = datetime('now')`);
// Un pl id par restaurant : suffixe -<loc> pour garder l'immutabilité globale.
// Besoin d'un seul pltoir par resto dans la table => id compose {plats-id}__{loc}.
let inserted = 0;
const insertPlat = db.prepare(`INSERT OR IGNORE INTO plats (id, name, description, price, category, price_from, image, location_id)
  VALUES (@id, @name, @description, @price, @category, @priceFrom, @image, @locationId)`);
const localUpsert = db.prepare(`UPDATE plats SET name = @name, description = @description, price = @price, category = @category, price_from = @priceFrom, image = @image, updated_at = datetime('now') WHERE id = @id`);
for (const loc of LOCATIONS) {
  for (const p of parsed) {
    const id = `${p.id}@${loc.id}`;
    const exists = db.prepare("SELECT id FROM plats WHERE id = ?").get(id);
    if (exists) {
      localUpsert.run({ ...p, id, locationId: loc.id });
    } else {
      insertPlat.run({ ...p, id, locationId: loc.id });
      inserted++;
    }
  }
}
console.log(`Plats insérés : ${inserted} (${LOCATIONS.length} restaurants × ${parsed.length} plats)`);

/* ── content `menu` = menu commun (mêmes 65 plats), conservé pour repli ── */
const commonMenu = parsed.map((p) => ({ ...p, priceFrom: Boolean(p.priceFrom), locationIds: LOCATIONS.map((l) => l.id) }));
db.prepare(`INSERT INTO content (key, payload, updated_at) VALUES ('menu', ?, datetime('now'))
  ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`)
  .run(JSON.stringify(commonMenu));

/* ── content `<id>:menu` aligné avec la table plats ───────────────────── */
for (const loc of LOCATIONS) {
  const mine = parsed.map((p) => ({ ...p, id: `${p.id}@${loc.id}`, priceFrom: Boolean(p.priceFrom), locationIds: [loc.id], locationId: loc.id }));
  db.prepare(`INSERT INTO content (key, payload, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`)
    .run(`${loc.id}:menu`, JSON.stringify(mine));
}

/* ── 1 admin par restaurant (1 resto = 1 admin) + super_admin bootstrap ─ */
const tempPasswords = [];
const insertUser = db.prepare("INSERT INTO users (email, name, password_hash, location_id, role, active, must_change_password, created_by) VALUES (?, ?, ?, ?, 'admin', 1, 1, NULL)");
for (const loc of LOCATIONS) {
  const existing = db.prepare("SELECT id FROM users WHERE role = 'admin' AND location_id = ?").get(loc.id);
  if (existing) { console.log(`Admin déjà présent pour ${loc.id} (id ${existing.id}) — ignoré.`); continue; }
  const email = `gerant+${loc.id}@texas-grillz.fr`;
  const temp = `Tg-${crypto.randomBytes(6).toString("hex")}-!`;
  insertUser.run(email, `Gérant ${loc.name}`, bcrypt.hashSync(temp, 12), loc.id);
  tempPasswords.push({ email, temp, resto: loc.id });
}
console.log("\nMots de passe temporaires (à transmettre, UNA Seule fois) :");
for (const t of tempPasswords) console.log(`  ${t.resto.padEnd(22)} ${t.email}  →  ${t.temp}`);
console.log("\nTermine. Redémarrez le serveur pour charger la base migrée.");
db.close();
