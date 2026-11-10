/**
 * Crée un compte super_admin (amorcage, jamais via l'interface au départ).
 *
 * Email et mot de passe lus dans l'environnement, jamais dans le code :
 *   SUPER_ADMIN_EMAIL=… SUPER_ADMIN_PASSWORD=… [SUPER_ADMIN_NAME=…] node scripts/create-super-admin.mjs
 */
import process from "node:process";

const email = (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD || "";
const name = process.env.SUPER_ADMIN_NAME || "Propriétaire";

if (!email || password.length < 12) {
  console.error("SUPER_ADMIN_EMAIL et SUPER_ADMIN_PASSWORD (≥12 caractères) requis.");
  process.exit(1);
}

const path = await import("node:path");
const { fileURLToPath } = await import("node:url");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(root, "server", "data", "tg.sqlite");

// Les dépendances (bcryptjs, better-sqlite3) vivent dans server/node_modules,
// pas à la racine : on les charge par chemin absolu (comme les migrations).
const bcrypt = (await import(path.join(root, "server", "node_modules", "bcryptjs", "index.js"))).default;
const Database = (await import(path.join(root, "server", "node_modules", "better-sqlite3", "lib", "index.js"))).default;
const db = new Database(dbPath);
const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
if (exists) {
  console.error(`Un compte existe déjà pour ${email} (id ${exists.id}).`);
  process.exit(1);
}
const info = db
  .prepare(
    "INSERT INTO users (email, name, password_hash, location_id, role, active, must_change_password) VALUES (?, ?, ?, NULL, 'super_admin', 1, 0)"
  )
  .run(email, name, bcrypt.hashSync(password, 12));
console.log(`Compte super_admin créé : ${email} (id ${info.lastInsertRowid})`);
db.close();
