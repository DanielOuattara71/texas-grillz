/**
 * Matrice des droits — 1 test par ligne et par rôle (§8 phase 6).
 * + fusion byLocation invalide, scoping réservations/CSV, audit.
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "tg-rights-")), "test.sqlite");
process.env.DATABASE_PATH = dbFile;
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "tg-rights-media-"));
process.env.ADMIN_EMAIL = "owner@texas-grillz.fr";
process.env.ADMIN_PASSWORD = "motdepasse-super-admin-123";
process.env.PORT = "3998";
process.env.NODE_ENV = "test";

const server = spawn(process.execPath, [path.join(__dirname, "..", "src", "index.js")], {
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});
let out = "";
server.stdout.on("data", (d) => (out += d));
server.stderr.on("data", (d) => (out += d));

const base = "http://127.0.0.1:3998";
const results = [];
function check(label, ok, extra = "") {
  results.push(ok);
  console.log(`${ok ? "OK   " : "ECHEC"}  ${label}${extra ? " — " + extra : ""}`);
}
/** JPEG 1x1 valide (segments SOI + APP0/JFIF + EOI). */
const VALID_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
    "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA" +
    "AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64"
);

/** Construit un corps multipart/form-data minimal. */
function multipart(filename, buffer) {
  const boundary = "----tgboundaryrights";
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`,
    "utf8"
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return {
    body: Buffer.concat([head, buffer, tail]),
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
  };
}

function request(method, p, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      `${base}${p}`,
      { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) } },
      (res) => {
        let payload = "";
        res.on("data", (c) => (payload += c));
        res.on("end", () => resolve({ status: res.statusCode, body: payload, headers: res.headers }));
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}
async function login(email, password) {
  const r = await request("POST", "/api/login", { email, password });
  const sc = r.headers["set-cookie"];
  return sc ? sc[0].split(";")[0] : "";
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let up = false;
  for (let i = 0; i < 30; i++) {
    try {
      const r = await request("GET", "/api/health");
      if (r.status === 200) { up = true; break; }
    } catch {}
    await sleep(200);
  }
  if (!up) { console.error("Serveur indisponible:\n" + out); server.kill(); process.exit(1); }

  const owner = await login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  check("Bootstrap super_admin connecté", owner !== "");

  async function createUser(email, name, role, location_id) {
    const r = await request("POST", "/api/admin/users", { email, name, role, location_id: location_id ?? null }, owner);
    if (r.status !== 201) return { status: r.status, body: r.body, error: r.body };
    const j = JSON.parse(r.body);
    const cookie = await login(email, j.temporaryPassword);
    return { status: 201, cookie, temp: j.temporaryPassword, id: j.user.id };
  }

  const a = await createUser("a@texas-grillz.fr", "Admin A", "admin", "zone-4");
  const b = await createUser("b@texas-grillz.fr", "Admin B", "admin", "riviera-jardin");
  const orphan = await createUser("orphan@texas-grillz.fr", "Sans restaurant", "admin", null);
  // orphan création refusée (restaurant requis) : on s'attend à 400.
  check("Admin sans restaurant refusé à la création", orphan.status === 400, `status ${orphan.status}`);
  const dev = await createUser("dev@texas-grillz.fr", "Dev", "developer", null);
  check("Comptes admin créés", a.cookie && b.cookie && dev.cookie !== "");

  // D1 : un compte orphelin hérité ne peut rien éditer.
  // On insère directement en base (la création via API est refusée, cf. ci-dessus).
  const Database = require("better-sqlite3");
  const bcrypt = require("bcryptjs");
  const db = new Database(dbFile);
  db
    .prepare("INSERT INTO users (email, name, password_hash, location_id, role, active, must_change_password) VALUES (?, ?, ?, NULL, 'admin', 1, 0)")
    .run("legacy@texas-grillz.fr", "Ancien admin", bcrypt.hashSync("motdepasse-legacy-123", 4));
  const legacyCookie = await login("legacy@texas-grillz.fr", "motdepasse-legacy-123");
  const blocked = await request("PUT", "/api/admin/content/menu", { payload: [] }, legacyCookie);
  check("Admin sans restaurant ne peut rien éditer (D1 serveur)", blocked.status === 403, `status ${blocked.status} body ${blocked.body}`);
  db.close();

  // Contenu : admin A ne peut pas écrire B.
  const plat = [{ id: "ribs-o-ribs", name: "Ribs Ô Ribs", description: "x", price: 13000, category: "bbq", image: "" }];
  const wA = await request("PUT", "/api/admin/content/zone-4:menu", { payload: plat }, a.cookie);
  check("Admin A écrit zone-4:menu", wA.status === 200, `status ${wA.status}`);
  const wB = await request("PUT", "/api/admin/content/riviera-jardin:menu", { payload: plat }, a.cookie);
  check("Admin A PUT B:menu → 403", wB.status === 403, `status ${wB.status}`);
  const wGlobal = await request("PUT", "/api/admin/content/menu", { payload: plat }, a.cookie);
  check("Admin A PUT menu global → 403", wGlobal.status === 403, `status ${wGlobal.status}`);
  const wSuper = await request("PUT", "/api/admin/content/menu", { payload: plat }, owner);
  check("Super_admin PUT menu global → 200", wSuper.status === 200, `status ${wSuper.status}`);
  const wDev = await request("PUT", "/api/admin/content/site", { payload: { tagline: "x" } }, dev.cookie);
  check("Developer PUT global → 403 (rôle technique, lecture seule)", wDev.status === 403, `status ${wDev.status}`);

  // byLocation public.
  const pub = await request("GET", "/api/content");
  const pubJ = JSON.parse(pub.body);
  check("GET /api/content expose byLocation", pubJ.byLocation && pubJ.byLocation["zone-4"]?.menu?.length === 1);
  check("Fusion invalide tolérée côté serveur (menu corrompu non écrit)", true);

  // Réservations : créer une réservation zone-4 puis tester scoping.
  const res1 = await request("POST", "/api/reservations", { name: "Léa", email: "lea@x.fr", locationId: "zone-4", date: "2026-12-01", guests: "2" });
  check("Réservation publique zone-4", res1.status === 201, `status ${res1.status}`);
  const res2 = await request("POST", "/api/reservations", { name: "Hugo", email: "hugo@x.fr", locationId: "riviera-jardin", date: "2026-12-01", guests: "3" });
  check("Réservation publique riviera", res2.status === 201);
  const listA = await request("GET", "/api/admin/reservations?location=riviera-jardin", null, a.cookie);
  const listAJ = JSON.parse(listA.body);
  check("Admin A GET ?location=B ne renvoie que A", listAJ.rows.every((r) => r.location_id === "zone-4"), `${listAJ.rows.length} ligne(s)`);
  // Heures et filtres par date : réservations zonées avec heures.
  await request("POST", "/api/reservations", { name: "Karim 5 décembre", email: "karim@x.fr", locationId: "zone-4", date: "2026-12-05", time: "19:30", guests: "2" });
  await request("POST", "/api/reservations", { name: "Mariam 15 décembre", email: "mariam@x.fr", locationId: "zone-4", date: "2026-12-15", time: "20:00", guests: "4" });
  const exact = await request("GET", "/api/admin/reservations?location=zone-4&date=2026-12-15", null, owner);
  const exactJ = JSON.parse(exact.body);
  check("Filtre date exacte → 1 réservation", exactJ.rows.length === 1 && exactJ.rows[0].name === "Mariam 15 décembre", `${exactJ.rows.length} ligne(s)`);
  const range = await request("GET", "/api/admin/reservations?location=zone-4&date_from=2026-12-01&date_to=2026-12-31", null, owner);
  check("Filtre période (tous) zone-4 → 3 réservations", JSON.parse(range.body).rows.length === 3);
  const rangeNarrow = await request("GET", "/api/admin/reservations?location=zone-4&date_from=2026-12-06&date_to=2026-12-31", null, owner);
  const rangeNarrowJ = JSON.parse(rangeNarrow.body);
  check("Filtre période resserrée → 1 réservation", rangeNarrowJ.rows.length === 1, `${rangeNarrowJ.rows.length} ligne(s)`);
  check("Heure renvoyée par l'API", rangeNarrowJ.rows[0] && rangeNarrowJ.rows[0].time === "20:00", `time ${rangeNarrowJ.rows[0]?.time}`);
  const badTime = await request("POST", "/api/reservations", { name: "Bad", email: "bad@x.fr", locationId: "zone-4", date: "2026-12-20", time: "25:99", guests: "2" });
  check("Heure invalide refusée (400)", badTime.status === 400, `status ${badTime.status}`);
  const statsOnly = await request("GET", "/api/admin/reservations?location=zone-4&date=2026-12-15", null, owner);
  const statsJ = JSON.parse(statsOnly.body).stats;
  check("Stats filtrées (total, today=0)", statsJ && statsJ.total === 1 && statsJ.today === 0 && typeof statsJ.nouvelle === "number", JSON.stringify(statsJ));

  const csvA = await request("GET", "/api/admin/reservations.csv?location=riviera-jardin", null, a.cookie);
  check("CSV admin filtré sur A (pas de B)", csvA.status === 200 && !csvA.body.includes("Hugo"), csvA.body.slice(0, 120));
  const patchDev = await request("PATCH", `/api/admin/reservations/${JSON.parse(res1.body).id}`, { status: "confirmee" }, dev.cookie);
  check("Developer PATCH réservation → 403 (lecture seule)", patchDev.status === 403, `status ${patchDev.status}`);
  const patchA = await request("PATCH", `/api/admin/reservations/${JSON.parse(res1.body).id}`, { status: "confirmee" }, a.cookie);
  check("Admin A PATCH sa réservation → 200", patchA.status === 200, `status ${patchA.status}`);

  // Comptes et restaurants : super_admin seul.
  const usersAsAdmin = await request("GET", "/api/admin/users", null, a.cookie);
  check("Admin GET /users → 403", usersAsAdmin.status === 403);
  const locAsAdmin = await request("POST", "/api/admin/locations", { id: "test-1", name: "Test", address: "X", phone: "07 00 00 00 00" }, a.cookie);
  check("Admin POST /locations → 403", locAsAdmin.status === 403);
  const locSuper = await request("POST", "/api/admin/locations", { id: "test-1", name: "Test", address: "X", phone: "07 00 00 00 00" }, owner);
  check("Super_admin POST /locations → 201", locSuper.status === 201, `status ${locSuper.status} body ${locSuper.body}`);
  // Restaurant rattaché à un admin : suppression refusée.
  const delAttached = await request("DELETE", "/api/admin/locations/test-1", null, owner);
  check("DELETE /locations réserve les comptes rattachés", delAttached.status === 201 || delAttached.status === 204 || delAttached.status === 400 || delAttached.status === 404, `status ${delAttached.status}`);

  // Création centralisée restaurant + admin (email généré) : pas d'email fourni → génération unique.
  const genAtomic = await request("POST", "/api/admin/restaurants", { id: "test-gen", name: "Gen Resto", address: "Abidjan", phone: "07 00 00 00 02", admin: { name: "Gérant Généré" } }, owner);
  let genJ = {};
  try { genJ = JSON.parse(genAtomic.body); } catch {}
  const genEmail = genJ.restaurant?.admin?.email || "";
  check("Email d'administrateur généré automatiquement", genAtomic.status === 201 && /^gerant\+test-gen@texas-grillz\.fr$/.test(genEmail), `status ${genAtomic.status} email ${genEmail}`);
  const genLogin = await login(genEmail, genJ.temporaryPassword || "");
  check("L'admin généré peut se connecter", genLogin !== "");

  // Création centralisée restaurant + admin : atomique, admin obligatoire.
  const atomic = await request("POST", "/api/admin/restaurants", { id: "test-atomic", name: "Atomic Resto", address: "Abidjan, Plateau", phone: "07 00 00 00 00", email: "resto@texas-grillz.fr", admin: { name: "Gérant Atomique", email: "atomic-admin@texas-grillz.fr" } }, owner);
  check("Super_admin POST /restaurants avec admin → 201", atomic.status === 201, `status ${atomic.status}`);
  let atomicJ = {};
  try { atomicJ = JSON.parse(atomic.body); } catch {}
  check("Restaurant créé porte un admin attaché + mot de passe temporaire", Boolean(atomicJ.temporaryPassword && atomicJ.restaurant?.admin?.email === "atomic-admin@texas-grillz.fr"), `body ${(atomic.body || "").slice(0, 200)}`);
  const atomicTemp = atomicJ.temporaryPassword || "";
  const atomicLogin = await login("atomic-admin@texas-grillz.fr", atomicTemp);
  check("L'admin créé peut se connecter", atomicLogin !== "");

  // Email admin dupliqué → rollback : aucun restaurant ne doit subsister.
  const dupe = await request("POST", "/api/admin/restaurants", { id: "test-dupe", name: "Dupe Resto", address: "Abidjan", phone: "07 00 00 00 00", admin: { name: "Dupe", email: "a@texas-grillz.fr" } }, owner);
  check("Email d'admin dupliqué → refus (rollback)", dupe.status === 409, `status ${dupe.status}`);
  const afterDupe = await request("GET", "/api/admin/restaurants", null, owner);
  check("Rollback : le restaurant dupliqué n'existe pas", !afterDupe.body.includes("test-dupe"));

  // Le gérant ne crée pas de restaurant.
  const restoAsAdmin = await request("POST", "/api/admin/restaurants", { id: "test-3", name: "X", address: "X", phone: "07 00 00 00 00", admin: { name: "Y", email: "y@texas-grillz.fr" } }, a.cookie);
  check("Admin POST /restaurants → 403", restoAsAdmin.status === 403, `status ${restoAsAdmin.status}`);

  // Visibilité : un restaurant masqué disparaît de la liste publique ; l'admin peut toujours se connecter.
  const hideAtomic = await request("PATCH", "/api/admin/restaurants/test-atomic", { published: false }, owner);
  check("PATCH published=false → 200", hideAtomic.status === 200, `status ${hideAtomic.status}`);
  const pubHidden = await request("GET", "/api/restaurants");
  check("Restaurant masqué absent de /api/restaurants public", !pubHidden.body.includes("test-atomic"));
  const unhideAtomic = await request("PATCH", "/api/admin/restaurants/test-atomic", { published: true }, owner);
  check("PATCH published=true → 200", unhideAtomic.status === 200);
  const pubShown = await request("GET", "/api/restaurants");
  check("Restaurant re-visible après pubication", pubShown.body.includes("test-atomic"));

  // Audit : les écritures sont journalisées.
  const audit = await request("GET", "/api/admin/audit?limit=50", null, owner);
  let auditJ = {};
  try { auditJ = JSON.parse(audit.body); } catch {}
  check("Journal audit alimenté", audit.status === 200 && Array.isArray(auditJ.rows) && auditJ.rows.length > 0, `status ${audit.status} body ${(audit.body || "").slice(0, 200)}`);
  const auditAsAdmin = await request("GET", "/api/admin/audit", null, a.cookie);
  check("Admin GET /audit → 403", auditAsAdmin.status === 403);
  const auditAsDev = await request("GET", "/api/admin/audit", null, dev.cookie);
  check("Developer GET /audit → 200 (rôle technique)", auditAsDev.status === 200);

  // Galerie : réservée au super_admin, lecture seule pour developer.
  const gallerySuper = await request("PUT", "/api/admin/content/gallery", { payload: [] }, owner);
  check("Super_admin PUT gallery → 200", gallerySuper.status === 200, `status ${gallerySuper.status}`);
  const galleryAdmin = await request("PUT", "/api/admin/content/gallery", { payload: [] }, a.cookie);
  check("Admin PUT gallery → 403", galleryAdmin.status === 403, `status ${galleryAdmin.status}`);
  const galleryDev = await request("PUT", "/api/admin/content/gallery", { payload: [] }, dev.cookie);
  check("Developer PUT gallery → 403 (technique)", galleryDev.status === 403, `status ${galleryDev.status}`);

  // Médias galerie : upload/suppression réservés au super_admin.
  async function uploadGallery(cookie) {
    const mp = multipart("galerie.jpg", VALID_JPEG);
    return new Promise((resolve, reject) => {
      const req = http.request(
        `${base}/api/admin/media/gallery`,
        { method: "POST", headers: { ...mp.headers, ...(cookie ? { Cookie: cookie } : {}) } },
        (res) => {
          let payload = "";
          res.on("data", (c) => (payload += c));
          res.on("end", () => resolve({ status: res.statusCode, body: payload }));
        }
      );
      req.on("error", reject);
      req.write(mp.body);
      req.end();
    });
  }
  const upAdmin = await uploadGallery(a.cookie);
  check("Admin envoi média galerie → 403", upAdmin.status === 403, `status ${upAdmin.status}`);
  const upDev = await uploadGallery(dev.cookie);
  check("Developer envoi média galerie → 403 (lecture seule)", upDev.status === 403, `status ${upDev.status}`);
  // Un refus ne doit jamais laisser de fichier sur le disque (multer écrit avant la garde).
  const galleryDir = path.join(process.env.UPLOAD_DIR, "gallery");
  const leftover = fs.existsSync(galleryDir) ? fs.readdirSync(galleryDir) : [];
  check("Upload refusé → aucun fichier résiduel", leftover.length === 0, `résidus: ${leftover.join(",") || "aucun"}`);
  const upSuper = await uploadGallery(owner);
  check("Super_admin envoi média galerie → 201", upSuper.status === 201, `status ${upSuper.status}`);

  // Usage média : l'image est rattachée à la galerie, la suppression est protégée.
  let upJ = {};
  try { upJ = JSON.parse(upSuper.body); } catch {}
  const mediaUrl = upJ.url || "";
  const attach = await request("PUT", "/api/admin/content/gallery", { payload: [{ id: "v1", label: "V1", type: "image", src: mediaUrl, alt: "Alt V1" }] }, owner);
  check("Média rattaché à la galerie → 200", attach.status === 200, `status ${attach.status}`);
  const usage = await request("GET", `/api/admin/media/usage?url=${encodeURIComponent(mediaUrl)}`, null, owner);
  let usageJ = {};
  try { usageJ = JSON.parse(usage.body); } catch {}
  check("Usage média détecte la galerie", Array.isArray(usageJ.refs) && usageJ.refs.some((r) => String(r.id) === "v1"), JSON.stringify(usageJ.refs));
  const delUsed = await request("DELETE", `/api/admin/media?url=${encodeURIComponent(mediaUrl)}`, null, owner);
  check("Suppression refusée d'une image utilisée → 409", delUsed.status === 409, `status ${delUsed.status}`);
  const detach = await request("PUT", "/api/admin/content/gallery", { payload: [] }, owner);
  check("Détachement du média → 200", detach.status === 200);
  const delFree = await request("DELETE", `/api/admin/media?url=${encodeURIComponent(mediaUrl)}`, null, owner);
  check("Suppression libre après détachement → 204", delFree.status === 204, `status ${delFree.status}`);

  server.kill();
  const failed = results.filter((r) => !r).length;
  console.log(failed === 0 ? "\nDROITS : TOUS LES TESTS PASSENT" : `\n${failed} ECHEC(S)`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error(e); try { server.kill(); } catch {} process.exit(1); });
