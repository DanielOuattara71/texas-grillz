/**
 * Entités Restaurant + Plat + règle 1 restaurant = 1 admin.
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "tg-plats-")), "test.sqlite");
process.env.DATABASE_PATH = dbFile;
process.env.ADMIN_EMAIL = "owner@texas-grillz.fr";
process.env.ADMIN_PASSWORD = "motdepasse-super-admin-123";
process.env.PORT = "3996";
process.env.NODE_ENV = "test";

const server = spawn(process.execPath, [path.join(__dirname, "..", "src", "index.js")], {
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});
let out = "";
server.stdout.on("data", (d) => (out += d));
server.stderr.on("data", (d) => (out += d));
const base = "http://127.0.0.1:3996";
const results = [];
function check(label, ok, extra = "") {
  results.push(ok);
  console.log(`${ok ? "OK   " : "ECHEC"}  ${label}${extra ? " — " + extra : ""}`);
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
  check("Owner connecté", owner !== "");

  const r1 = await request("POST", "/api/admin/restaurants", { id: "zone-4", name: "Zone 4", address: "X", phone: "07 00 00 00 00", admin: { name: "Gérant Zone 4", email: "gerant-zone-4@texas-grillz.fr" } }, owner);
  check("Créer restaurant", r1.status === 201, `status ${r1.status} ${r1.body}`);
  const r2 = await request("POST", "/api/admin/restaurants", { id: "riviera", name: "Riviera", address: "Y", phone: "07 00 00 00 01", admin: { name: "Gérant Riviera", email: "gerant-riviera@texas-grillz.fr" } }, owner);
  check("Créer 2e restaurant", r2.status === 201, `status ${r2.status} ${r2.body}`);

  async function createUser(email, role, location_id) {
    const r = await request("POST", "/api/admin/users", { email, name: email.split("@")[0], role, location_id: location_id ?? null }, owner);
    const j = JSON.parse(r.body || "{}");
    const cookie = j.temporaryPassword ? await login(email, j.temporaryPassword) : "";
    return { status: r.status, cookie, body: r.body };
  }
  // L'administrateur zone-4 est créé atomiquement avec le restaurant : on se connecte avec lui.
  const atomicA = await createUser("unused@texas-grillz.fr", "admin", "riviera");
  check("Restaurant riviera a son admin attaché (2e refusé)", atomicA.status === 400, `status ${atomicA.status}`);
  const a = { status: 201, cookie: "" };
  try {
    const j = JSON.parse(r1.body);
    a.cookie = await login("gerant-zone-4@texas-grillz.fr", j.temporaryPassword);
  } catch {}
  check("Admin zone-4 (atomique) créé et connecté", a.cookie !== "");
  const dup = await createUser("a2@texas-grillz.fr", "admin", "zone-4");
  check("2e admin même restaurant refusé (1 resto = 1 admin)", dup.status === 400, `status ${dup.status} ${dup.body}`);
  const superB = await createUser("owner2@texas-grillz.fr", "super_admin", null);
  check("Super admin peut ajouter plusieurs admins", superB.status === 201, `status ${superB.status}`);

  const p1 = await request("POST", "/api/admin/plats", { id: "ribs", name: "Ribs", description: "", price: 13000, category: "bbq", image: "", locationId: "zone-4" }, a.cookie);
  check("Admin ajoute un plat à son resto", p1.status === 201, `status ${p1.status} ${p1.body}`);
  const p2 = await request("POST", "/api/admin/plats", { id: "tags", name: "Tags", description: "", price: 14000, category: "saisonniers", image: "", locationId: "zone-4" }, a.cookie);
  check("Admin ajoute plusieurs plats", p2.status === 201);
  const pForeign = await request("POST", "/api/admin/plats", { id: "x1", name: "X", description: "", price: 1000, category: "bbq", image: "", locationId: "riviera" }, a.cookie);
  check("Admin ne peut pas ajouter pour un autre resto (403)", pForeign.status === 403, `status ${pForeign.status}`);

  const pub = await request("GET", "/api/plats?location=zone-4");
  const pubJ = JSON.parse(pub.body);
  check("Public plats zone-4", pub.status === 200 && pubJ.plats.length === 2, `${pubJ.plats.length}`);
  const pub2 = await request("GET", "/api/plats?location=riviera");
  check("Public plats riviera vides", JSON.parse(pub2.body).plats.length === 0);
  const pubs = await request("GET", "/api/restaurants");
  check("Public restaurants actifs", JSON.parse(pubs.body).restaurants.length === 2);

  server.kill();
  const failed = results.filter((r) => !r).length;
  console.log(failed === 0 ? "\nPLATS/RESTAURANTS : TOUS LES TESTS PASSENT" : `\n${failed} ECHEC(S)`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error(e); try { server.kill(); } catch {} process.exit(1); });
