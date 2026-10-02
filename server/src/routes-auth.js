/**
 * Routes d'authentification de l'espace d'administration.
 *
 * Toute la surface sensible passe par `requireAuth` : sans cookie de session
 * valide, la reponse est 401. Aucune information de contenu n'est lisible sans
 * avoir passe cette garde.
 */
const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const {
  COOKIE,
  TTL_HOURS,
  authenticate,
  createSession,
  userFromToken,
  destroySession,
  changePassword,
} = require("./auth");

const isProduction = process.env.NODE_ENV === "production";

const credentials = z.object({
  email: z.string().email("Adresse email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

const passwordChange = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12, "12 caracteres minimum."),
});

/**
 * Garde de session : bloque toute route admin si le cookie est absent,
 * expire ou invalide. C'est le seul point de controle : une route oubliee
 * dans `requireAuth` reste fermee, jamais ouverte par defaut.
 */
function requireAuth(req, res, next) {
  const user = userFromToken(req.cookies?.[COOKIE]);
  if (!user) {
    return res.status(401).json({ error: "Connexion requise." });
  }
  req.user = { id: user.user_id, email: user.email, name: user.name };
  next();
}

const router = express.Router();

/* ── Connexion ──────────────────────────────────────────────────────────── */

// Limite serree : 10 tentatives par quart d'heure et par IP. Un attaquant
// peut continuer apres, mais pas casser un mot de passe a vitesse humaine.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Reessayez dans quelques minutes." },
});

router.post("/login", loginLimiter, (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Adresse email et mot de passe requis." });
  }

  const user = authenticate(parsed.data.email, parsed.data.password);
  if (!user) {
    // Message volontairement identique a celui d'un email inconnu.
    return res.status(401).json({ error: "Adresse email ou mot de passe incorrect." });
  }

  const token = createSession(user.id);
  res.cookie(COOKIE, token, {
    httpOnly: true, // inaccessible au JavaScript de la page
    sameSite: "lax", // pas envoye depuis un autre site (protection CSRF de base)
    secure: isProduction, // HTTPS uniquement en production
    maxAge: TTL_HOURS * 60 * 60 * 1000,
    path: "/",
  });

  res.json({ user: { id: user.id, email: user.email, name: user.name } });
});

router.post("/logout", (req, res) => {
  destroySession(req.cookies?.[COOKIE]);
  res.clearCookie(COOKIE, { path: "/" });
  res.status(204).end();
});

/** Etat de la session au chargement de l'admin : 200 si connecte, 401 sinon. */
router.get("/me", (req, res) => {
  const user = userFromToken(req.cookies?.[COOKIE]);
  if (!user) return res.status(401).json({ error: "Non connecte." });
  res.json({ user: { id: user.user_id, email: user.email, name: user.name } });
});

router.post("/password", requireAuth, (req, res) => {
  const parsed = passwordChange.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Mot de passe actuel et nouveau mot de passe (12 caracteres minimum) requis." });
  }
  const ok = changePassword(req.user.id, parsed.data.currentPassword, parsed.data.newPassword);
  if (!ok) return res.status(401).json({ error: "Mot de passe actuel incorrect." });

  destroySession(req.cookies?.[COOKIE]);
  res.clearCookie(COOKIE, { path: "/" });
  res.status(204).end();
});

module.exports = { router, requireAuth };
