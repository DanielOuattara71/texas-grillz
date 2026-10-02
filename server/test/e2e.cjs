/**
 * Test de bout en bout : backend demarre + build du site servi, verification
 * que l'admin repond sur /admin et que le formulaire public depose reellement
 * une reservation que l'admin peut relire.
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "tg-e2e-")), "e2e.sqlite");
process.env.DATABASE_PATH = dbFile;
process.env.ADMIN_EMAIL = "gerante@texas-grillz.fr";
process.env.ADMIN_PASSWORD = "un-mot-de-passe-tres-long";
process.env.PORT = "3998";
process.env.NODE_ENV = "test";

const { spawn } = require("node:child_process");
const server = spawn(process.execPath, [path.join(__dirname, "..", "src", "index.js")], {
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});

let out = "";
server.stdout.on("data", (d) => (out += d));
server.stderr.on("data", (d) => (out += d));

const base = "http://127.0.0.1:3998";
let cookie = "";

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      `${base}${urlPath}`,
      {
        method,
        headers: {
          ...(data ? { "Content-Type": "application/json" } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
      },
      (res) => {
        let payload = "";
        res.on("data", (c) => (payload += c));
        res.on("end", () =>
          resolve({ status: res.statusCode, body: payload, setCookie: res.headers["set-cookie"] })
        );
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

const results = [];
const check = (label, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "OK   " : "ECHEC"}  ${label}${extra ? " — " + extra : ""}`);
};

(async () => {
  let up = false;
  for (let i = 0; i < 40; i += 1) {
    try {
      if ((await request("GET", "/api/health")).status === 200) {
        up = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!up) {
    console.error("Serveur indisponible :\n" + out);
    server.kill();
    process.exit(1);
  }

  // Le build Vite est servi par le meme serveur quand il existe.
  const home = await request("GET", "/");
  check("GET / sert le site (ou l'API seule si pas de build)", home.status === 200, `recu ${home.status}`);

  const admin = await request("GET", "/admin");
  check("GET /admin renvoie une page HTML", admin.status === 200 && admin.body.includes("<div id=\"root\">"));

  // Le visiteur reserve, sans etre connecte.
  const booking = await request("POST", "/api/reservations", {
    name: "Famille Dupont",
    email: "dupont@exemple.fr",
    phone: "06 12 34 56 78",
    date: "2026-12-24",
    guests: "6",
    message: "Une table pour Noel, allergie aux noix.",
  });
  check("Reservation publique acceptee", booking.status === 201, `recu ${booking.status}`);

  // L'admin se connecte et retrouve la demande.
  const login = await request("POST", "/api/login", {
    email: "gerante@texas-grillz.fr",
    password: "un-mot-de-passe-tres-long",
  });
  check("Connexion admin reussie", login.status === 200);
  cookie = login.setCookie[0].split(";")[0];

  const list = await request("GET", "/api/admin/reservations");
  const rows = JSON.parse(list.body).rows;
  check(
    "L'admin voit la reservation du visiteur",
    list.status === 200 && rows.length === 1 && rows[0].name === "Famille Dupont"
  );
  check("Le message libre est conserve", rows[0]?.message === "Une table pour Noel, allergie aux noix.");

  // Elle est confirmee, puis exportee en CSV.
  const patch = await request("PATCH", `/api/admin/reservations/${rows[0].id}`, {
    status: "confirmee",
  });
  check("Statut mis a jour", patch.status === 200);

  const csv = await request("GET", "/api/admin/reservations.csv");
  check(
    "Export CSV genere avec accents et BOM",
    csv.status === 200 && csv.body.includes("Dupont") && csv.body.charCodeAt(0) === 0xfeff
  );

  // Une reservation invalide est refusee.
  const bad = await request("POST", "/api/reservations", { name: "", email: "pas-un-email" });
  check("Reservation invalide refusee (400)", bad.status === 400, `recu ${bad.status}`);

  server.kill();
  fs.rmSync(path.dirname(dbFile), { recursive: true, force: true });

  const failed = results.filter((r) => !r).length;
  console.log(failed === 0 ? "\nPARCOURS COMPLET REUSSI" : `\n${failed} ECHEC(S)`);
  process.exit(failed === 0 ? 0 : 1);
})();
