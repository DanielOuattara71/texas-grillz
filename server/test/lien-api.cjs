/**
 * Test de la liaison reelle : le backend demarre pour de vrai, un admin
 * s'authentifie, ecrit un prix different, puis on relit la route publique pour
 * verifier que c'est bien ce prix-la que le site public affiche.
 *
 * On verifie aussi le comportement de repli : c'est le store front
 * (`src/content/store.tsx`) qui retombe sur `src/data` quand l'appel echoue,
 * donc ce test s'arrete a la coupure du serveur et laisse ce cas-la au test
 * `test:content`.
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tg-lien-"));
process.env.DATABASE_PATH = path.join(tmp, "lien.sqlite");
process.env.UPLOAD_DIR = path.join(tmp, "media");
process.env.ADMIN_EMAIL = "gerante@texas-grillz.fr";
process.env.ADMIN_PASSWORD = "motdepasse-de-lien-123";
process.env.PORT = "3996";
process.env.NODE_ENV = "test";

const { spawn } = require("node:child_process");
const server = spawn(process.execPath, [path.join(__dirname, "..", "src", "index.js")], {
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});

let out = "";
server.stdout.on("data", (d) => (out += d));
server.stderr.on("data", (d) => (out += d));

const base = "http://127.0.0.1:3996";
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
          resolve({ status: res.statusCode, body: payload, headers: res.headers })
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
      if ((await request("GET", "/api/health")).status === 200) { up = true; break; }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!up) {
    console.error("Serveur indisponible :\n" + out);
    server.kill();
    process.exit(1);
  }

  // Avant toute edition, le contenu public est vide (byLocation vide exclu).
  const before = JSON.parse((await request("GET", "/api/content")).body);
  const { byLocation: _bl, ...rest } = before;
  check("Contenu public vide au demarrage", Object.keys(rest).length === 0);

  // Connexion.
  const login = await request("POST", "/api/login", {
    email: "gerante@texas-grillz.fr",
    password: "motdepasse-de-lien-123",
  });
  const setCookie = login.headers["set-cookie"];
  cookie = setCookie ? setCookie[0].split(";")[0] : "";
  check("Connexion admin reussie", login.status === 200 && cookie !== "");

  // L'admin ecrit une carte avec un prix different de celui du depot.
  const prix = 31000;
  const write = await request("PUT", "/api/admin/content/menu", {
    payload: [
      {
        id: "ribs-o-ribs",
        name: "Ribs Ô Ribs",
        description: "Travers de porc assaisonnés",
        price: prix,
        category: "bbq",
        image: "/uploads/products/ribs-o-ribs-test.jpg",
      },
    ],
  });
  check("Ecriture du bloc carte acceptee", write.status === 200);

  // Le site public lit-il cette donnee ?
  const after = JSON.parse((await request("GET", "/api/content")).body);
  check(
    "Le site public recupere le prix ecrit par l'admin",
    after.menu?.[0]?.price === prix,
    `prix = ${after.menu?.[0]?.price}`
  );
  check(
    "La photo deposee est reprise",
    after.menu?.[0]?.image === "/uploads/products/ribs-o-ribs-test.jpg"
  );

  // Le telephone edite aussi.
  await request("PUT", "/api/admin/content/site", {
    payload: { phone: "04 11 22 33 44" },
  });
  const withPhone = JSON.parse((await request("GET", "/api/content")).body);
  check("Le telephone edite est lu par le site", withPhone.site?.phone === "04 11 22 33 44");

  // Le contenu survit a un redemarrage du serveur (base persistante).
  server.kill();
  await new Promise((r) => setTimeout(r, 500));
  const restarted = spawn(process.execPath, [path.join(__dirname, "..", "src", "index.js")], {
    env: process.env,
    stdio: "ignore",
  });
  await new Promise((r) => setTimeout(r, 2500));
  cookie = "";
  const afterRestart = JSON.parse((await request("GET", "/api/content")).body);
  check(
    "Le contenu survit au redemarrage du serveur",
    afterRestart.menu?.[0]?.price === prix
  );
  restarted.kill();

  fs.rmSync(tmp, { recursive: true, force: true });

  const failed = results.filter((r) => !r).length;
  console.log(failed === 0 ? "\nLIAISON REELLE : TOUS LES TESTS PASSENT" : `\n${failed} ECHEC(S)`);
  process.exit(failed === 0 ? 0 : 1);
})();
