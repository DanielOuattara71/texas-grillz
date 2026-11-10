/**
 * Test de l'envoi d'images, y compris les cas hostiles.
 *
 * Un JPEG valide de 1x1 est envoye tel quel ; les autres cas verifient que le
 * serveur refuse ce qu'il doit refuser. La base et le dossier de medias sont
 * jetables.
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tg-media-"));
process.env.DATABASE_PATH = path.join(tmp, "media.sqlite");
process.env.UPLOAD_DIR = path.join(tmp, "media");
process.env.ADMIN_EMAIL = "test@texas-grillz.fr";
process.env.ADMIN_PASSWORD = "motdepasse-solide-123";
process.env.PORT = "3997";
process.env.NODE_ENV = "test";

const { spawn } = require("node:child_process");
const server = spawn(process.execPath, [path.join(__dirname, "..", "src", "index.js")], {
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});

let out = "";
server.stdout.on("data", (d) => (out += d));
server.stderr.on("data", (d) => (out += d));

const base = "http://127.0.0.1:3997";
let cookie = "";

/** JPEG 1x1 valide (segments SOI + APP0/JFIF + EOI). */
const VALID_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
    "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA" +
    "AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64"
);

/** En-tete PNG suivi de donnees arbitraires. */
const FAKE_PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from("ceci n'est pas une image complete"),
]);

function request(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `${base}${urlPath}`,
      { method, headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) } },
      (res) => {
        let payload = "";
        res.on("data", (c) => (payload += c));
        res.on("end", () => resolve({ status: res.statusCode, body: payload, headers: res.headers }));
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

/** Construit un corps multipart/form-data et renvoie { body, contentType }. */
function multipart(fieldName, filename, contentType, buffer) {
  const boundary = "----tgboundary1234567890";
  // UTF-8 explicite : sans cela, Buffer.from(chaîne) encode en latin1 et le
  // nom accentue part en characteres fantomes.
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`,
    "utf8"
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return {
    body: Buffer.concat([head, buffer, tail]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
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

  const anon = multipart("file", "photo.jpg", "image/jpeg", VALID_JPEG);
  const noAuth = await request("POST", "/api/admin/media/products", anon.body, {
    "Content-Type": anon.contentType,
  });
  check("Envoi sans session refuse (401)", noAuth.status === 401, `recu ${noAuth.status}`);

  const login = await request(
    "POST",
    "/api/login",
    JSON.stringify({ email: "test@texas-grillz.fr", password: "motdepasse-solide-123" }),
    { "Content-Type": "application/json" }
  );
  check("Connexion reussie", login.status === 200);
  const setCookie = login.headers["set-cookie"];
  check("Cookie de session pose", Boolean(setCookie && setCookie[0]));
  cookie = setCookie ? setCookie[0].split(";")[0] : "";

  const good = multipart("file", "Brisket Fumé.JPG", "image/jpeg", VALID_JPEG);
  const uploaded = await request("POST", "/api/admin/media/products", good.body, {
    "Content-Type": good.contentType,
  });
  const url = uploaded.status === 201 ? JSON.parse(uploaded.body).url : null;
  check("JPEG valide accepte (201)", uploaded.status === 201, `recu ${uploaded.status}`);
  check(
    "Nom accentue normalise",
    /^\/uploads\/products\/brisket-fume-[0-9a-f]{8}\.jpg$/.test(url || ""),
    url || "pas d'URL"
  );
  const served = await request("GET", url || "/uploads/inexistant.jpg");
  check("Image servie en public (200)", served.status === 200, `recu ${served.status}`);

  const list = await request("GET", "/api/admin/media");
  const files = JSON.parse(list.body).files || [];
  check("Liste des medias contient le fichier", files.some((f) => f.url === url));
  check("Dossier correct (products)", files.some((f) => f.folder === "products"));

  const fake = multipart("file", "pirate.png", "image/png", FAKE_PNG);
  const rejected = await request("POST", "/api/admin/media/products", fake.body, {
    "Content-Type": fake.contentType,
  });
  check("Faux PNG rejete (400)", rejected.status === 400, `recu ${rejected.status}`);

  const afterFake = await request("GET", "/api/admin/media");
  const names = (JSON.parse(afterFake.body).files || []).map((f) => f.name);
  check("Le faux PNG n'est pas reste sur le disque", !names.some((n) => n.startsWith("pirate")));

  const script = multipart("file", "xss.html", "text/html", Buffer.from("<script>alert(1)</script>"));
  const blocked = await request("POST", "/api/admin/media/products", script.body, {
    "Content-Type": script.contentType,
  });
  check("HTML refuse (400)", blocked.status === 400, `recu ${blocked.status}`);

  const traversal = await request("DELETE", "/api/admin/media?url=/uploads/../../etc/passwd");
  check("Traversee de repertoire refusee (400)", traversal.status === 400, `recu ${traversal.status}`);

  const menuPut = await request("PUT", "/api/admin/content/menu", JSON.stringify({
    payload: [
      {
        id: "ribs-o-ribs",
        name: "Ribs Ô Ribs",
        description: "Travers de porc assaisonnés",
        price: 13000,
        category: "bbq",
        image: url,
      },
    ],
  }), { "Content-Type": "application/json", Cookie: cookie });
  check("Ecriture du bloc menu acceptee", menuPut.status === 200, `recu ${menuPut.status}`);

  const contentBefore = JSON.parse((await request("GET", "/api/content")).body);
  check("La photo referencee par le menu avant suppression", contentBefore.menu?.[0]?.image === url);

  const deleted = await request("DELETE", `/api/admin/media?url=${encodeURIComponent(url)}`);
  check("Suppression acceptee (204)", deleted.status === 204, `recu ${deleted.status}`);
  const gone = await request("GET", url);
  check("Image supprimee : 404 (pas du HTML)", gone.status === 404, `recu ${gone.status}`);

  const contentAfter = JSON.parse((await request("GET", "/api/content")).body);
  check("Suppression scrube la reference du bloc menu", !JSON.stringify(contentAfter).includes(url));

  server.kill();
  fs.rmSync(tmp, { recursive: true, force: true });

  const failed = results.filter((r) => !r).length;
  console.log(failed === 0 ? "\nMEDIAS : TOUS LES TESTS PASSENT" : `\n${failed} ECHEC(S)`);
  process.exit(failed === 0 ? 0 : 1);
})();
