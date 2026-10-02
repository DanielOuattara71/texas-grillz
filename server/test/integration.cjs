/**
 * Test d'integration du backend, lance sans framework de test.
 * Verifie le point sensible : la connexion, la session, et le refus sans cookie.
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

// Base jetable : on ne touche jamais la vraie base en test.
const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "tg-test-")), "test.sqlite");
process.env.DATABASE_PATH = dbFile;
process.env.ADMIN_EMAIL = "test@texasgrill.fr";
process.env.ADMIN_PASSWORD = "motdepasse-solide-123";
process.env.PORT = "3999";
process.env.NODE_ENV = "test";

const server = spawn(process.execPath, [path.join(__dirname, "..", "src", "index.js")], {
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});

let out = "";
server.stdout.on("data", (d) => (out += d));
server.stderr.on("data", (d) => (out += d));

const base = "http://127.0.0.1:3999";
let cookie = "";

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      `${base}${path}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
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
const check = (label, condition, extra = "") => {
  results.push(condition);
  console.log(`${condition ? "OK   " : "ECHEC"}  ${label}${extra ? " — " + extra : ""}`);
};

(async () => {
  // Attendre que le serveur ecoute. En cas d'echec, on affiche sa sortie :
  // sans cela, un simple ECONNREFUSED masque l'erreur de demarrage.
  let up = false;
  for (let i = 0; i < 40; i += 1) {
    try {
      const r = await request("GET", "/api/health");
      if (r.status === 200) {
        up = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }

  if (!up) {
    console.error("Le serveur n'a pas demarre. Sortie :\n" + out);
    server.kill();
    process.exit(1);
  }

  const health = await request("GET", "/api/health");
  check("GET /api/health -> 200", health.status === 200);

  // Sans cookie : contenu admin refuse, contenu public autorise.
  const noAuthContent = await request("GET", "/api/admin/content");
  check("GET /api/admin/content sans session -> 401", noAuthContent.status === 401);

  const noAuthReservations = await request("GET", "/api/admin/reservations");
  check("GET /api/admin/reservations sans session -> 401", noAuthReservations.status === 401);

  const publicContent = await request("GET", "/api/content");
  check("GET /api/content public -> 200", publicContent.status === 200);

  // Mauvais mot de passe.
  const badLogin = await request("POST", "/api/login", {
    email: "test@texasgrill.fr",
    password: "mauvais",
  });
  check("POST /api/login mauvais mot de passe -> 401", badLogin.status === 401, `recu ${badLogin.status}`);

  // Bon mot de passe.
  const goodLogin = await request("POST", "/api/login", {
    email: "test@texasgrill.fr",
    password: "motdepasse-solide-123",
  });
  check("POST /api/login bon mot de passe -> 200", goodLogin.status === 200, `recu ${goodLogin.status}`);
  const setCookie = goodLogin.setCookie && goodLogin.setCookie[0];
  cookie = setCookie ? setCookie.split(";")[0] : "";
  check("cookie de session httpOnly pose", Boolean(cookie) && /HttpOnly/i.test(setCookie || ""));

  // Avec session : contenu admin lisible, ecriture acceptee.
  const authContent = await request("GET", "/api/admin/content");
  check("GET /api/admin/content avec session -> 200", authContent.status === 200);

  // Ecriture d'un bloc `site` : toutes les clefs doivent etre valides, sinon
  // la validation la refuse (voir server/src/schemas.js).
  const write = await request("PUT", "/api/admin/content/site", {
    payload: { tagline: "Barbecue au feu de bois" },
  });
  check("PUT /api/admin/content/site -> 200", write.status === 200, `recu ${write.status}`);

  // Un contenu qui ne respecte pas le format est refuse, non enregistre.
  const badFormat = await request("PUT", "/api/admin/content/menu", {
    payload: [{ id: "brisket", name: "", description: "x", price: -5, category: "viandes", image: "" }],
  });
  check("PUT menu au format invalide -> 422", badFormat.status === 422, `recu ${badFormat.status}`);

  const badKey = await request("PUT", "/api/admin/content/inconnu", { payload: {} });
  check("PUT cle inconnue -> 400", badKey.status === 400);

  // Le contenu public reflects l'ecriture admin.
  const afterWrite = await request("GET", "/api/content");
  check(
    "GET /api/content reflete l'ecriture",
    afterWrite.status === 200 &&
      JSON.parse(afterWrite.body).site?.tagline === "Barbecue au feu de bois"
  );

  // Le contenu refuse n'a pas ete enregistre : le site reste sur son etat.
  const afterRefused = JSON.parse((await request("GET", "/api/content")).body);
  check("Le contenu invalide n'a pas ete enregistre", afterRefused.menu === undefined);

  // Reservation publique puis lecture admin.
  const booking = await request("POST", "/api/reservations", {
    name: "Jean",
    email: "jean@exemple.fr",
    date: "2026-12-25",
    guests: "4",
  });
  check("POST /api/reservations -> 201", booking.status === 201, `recu ${booking.status}`);

  const list = await request("GET", "/api/admin/reservations");
  check(
    "GET /api/admin/reservations avec session -> 200 et 1 ligne",
    list.status === 200 && JSON.parse(list.body).total === 1
  );

  // Deconnexion : la session doit disparaitre.
  const logout = await request("POST", "/api/logout");
  check("POST /api/logout -> 204", logout.status === 204);
  cookie = "";
  const afterLogout = await request("GET", "/api/admin/content");
  check("GET /api/admin/content apres logout -> 401", afterLogout.status === 401);

  server.kill();
  fs.rmSync(path.dirname(dbFile), { recursive: true, force: true });

  const failed = results.filter((r) => !r).length;
  console.log(failed === 0 ? "\nTOUS LES TESTS PASSENT" : `\n${failed} TEST(S) EN ECHEC`);
  process.exit(failed === 0 ? 0 : 1);
})();
