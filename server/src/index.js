/**
 * Serveur du site Texas GrillZ.
 *
 * Trois surfaces :
 *   - `/api/content`, `POST /api/reservations` : public, en lecture/ecriture
 *     minimale, pour que le site fonctionne sans authentification ;
 *   - `/api/admin/*` : protege par cookie de session ;
 *   - `/` : sert le build Vite s'il existe (deploiement monobloc).
 *
 * Le backend ne remplace pas l'hebergement statique du site : il peut tourner
 * a part (sous-domaine `api.`), et le front y pointe via VITE_API_URL.
 */
require("dotenv").config();

const path = require("node:path");
const fs = require("node:fs");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const { z } = require("zod");

const { ensureBootstrapAdmin } = require("./auth");
const { router: authRouter } = require("./routes-auth");
const { router: contentRouter } = require("./routes-content");
const { router: reservationsRouter } = require("./routes-reservations");
const { router: mediaRouter, UPLOAD_DIR, PUBLIC_PREFIX } = require("./routes-media");

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.set("trust proxy", 1); // requis derriere le proxy Railway/Render pour le rate-limit

// Derriere HTTPS, helmet active HSTS ; le cookie `secure` s'appuie aussi dessus.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(express.json({ limit: "256kb" }));
app.use(cookieParser());

/** Sante du service : utilise par Railway/Render pour le monitoring. */
app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api", authRouter);
app.use("/api", contentRouter);
app.use("/api", reservationsRouter);
app.use("/api", mediaRouter);

/**
 * Medias deposes par l'admin, servis en public (le site en a besoin pour les
 * afficher) mais jamais listables comme un dossier : Express ne sert que les
 * fichiers demandes, sans index.
 */
app.use(
  PUBLIC_PREFIX,
  express.static(UPLOAD_DIR, { maxAge: "7d", index: false, dotfiles: "deny" })
);

/** 404 JSON pour toute route /api inconnue (evite une page HTML dans un fetch). */
app.use("/api", (_req, res) => res.status(404).json({ error: "Route inconnue." }));

/**
 * Build Vite servi depuis le meme conteneur (optionnel). En separation, ce
 * middleware n'a rien a servir et l'app ne rend que l'API.
 */
const dist = path.join(__dirname, "..", "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: "1h" }));
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// Une image supprimee ne doit pas repondre du HTML : le navigateur afficherait
// un texte dans le cadre, et l'admin ne saurait pas que le fichier a disparu.
app.use(/^\/uploads\/.+/, (_req, res) => res.status(404).json({ error: "Media introuvable." }));

app.use((err, _req, res, _next) => {
  // Une erreur non geree ne doit jamais reveler la pile d'appels au client.
  console.error("[erreur]", err);
  const status = z.number().int().safeParse(err?.status).success ? err.status : 500;
  res.status(status).json({ error: status === 500 ? "Erreur interne." : err.message });
});

const seeded = ensureBootstrapAdmin();
if (seeded) {
  console.log(`[admin] compte cree depuis l'environnement : ${seeded.email}`);
}

app.listen(PORT, () => {
  console.log(`[serveur] pret sur http://localhost:${PORT}`);
  if (!process.env.ADMIN_EMAIL) {
    console.log("[admin] ADMIN_EMAIL / ADMIN_PASSWORD absents : aucun compte cree.");
  }
});
