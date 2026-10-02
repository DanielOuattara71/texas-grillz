/**
 * Authentification : connexion par session serveur.
 *
 * Pourquoi un jeton en base plutot qu'un JWT : la session est revocable
 * immediatement (logout, changement de mot de passe), ce qu'un JWT ne permet
 * pas sans liste de revocation. Le jeton ne quitte jamais le serveur : il vit
 * dans un cookie httpOnly, donc inaccessible au JavaScript de la page (une
 * injection XSS ne peut pas le lire).
 */
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { db } = require("./db");

const COOKIE = "tg_session";
/** Duree de vie d'une session : 12 h (une journee de service). */
const TTL_HOURS = 12;

const q = {
  userByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
  userById: db.prepare("SELECT id, email, name FROM users WHERE id = ?"),
  userByIdWithHash: db.prepare("SELECT * FROM users WHERE id = ?"),
  insertUser: db.prepare(
    "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)"
  ),
  countUsers: db.prepare("SELECT COUNT(*) AS n FROM users"),
  insertSession: db.prepare(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', ?))"
  ),
  findSession: db.prepare(
    `SELECT s.token, s.user_id, u.email, u.name
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > datetime('now')`
  ),
  deleteSession: db.prepare("DELETE FROM sessions WHERE token = ?"),
  deleteUserSessions: db.prepare("DELETE FROM sessions WHERE user_id = ?"),
  updatePassword: db.prepare("UPDATE users SET password_hash = ? WHERE id = ?"),
};

/**
 * Cree le premier administrateur depuis les variables d'environnement.
 * Ne s'execute qu'au demarrage et ne refuse rien si un compte existe deja
 * (le mot de passe d'origine ne peut donc pas ecraser un compte en place).
 * Retourne les identifiants pour les journaliser une fois.
 */
function ensureBootstrapAdmin() {
  if (q.countUsers.get().n > 0) return null;

  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || password.length < 12) return null;

  q.insertUser.run(email, process.env.ADMIN_NAME || "Administrateur", bcrypt.hashSync(password, 12));
  return { email, fromEnvironment: true };
}

const hashPassword = (plain) => bcrypt.hashSync(plain, 12);
const verifyPassword = (plain, hash) => bcrypt.compareSync(plain, hash);

/**
 * Verifie email + mot de passe. Renvoie l'utilisateur ou null.
 * Meme message d'erreur dans les deux cas : on ne revele pas quelle adresse
 * existe, ce qui evite l'enumeration des comptes.
 */
function authenticate(email, password) {
  const user = q.userByEmail.get(String(email || "").trim().toLowerCase());
  if (!user) {
    // Hash factice : repond en temps constant, sinon la difference de duree
    // permet de deviner quelles adresses sont enregistrees.
    bcrypt.compareSync(String(password || ""), "$2b$12$abcdefghijklmnopqrstuv012345678901234567890123456");
    return null;
  }
  if (!verifyPassword(String(password || ""), user.password_hash)) return null;
  return { id: user.id, email: user.email, name: user.name };
}

const createSession = (userId) => {
  const token = crypto.randomBytes(32).toString("hex");
  q.insertSession.run(token, userId, `+${TTL_HOURS} hours`);
  return token;
};

/** Utilisateur associe a un jeton, ou null si expire/inconnu. */
const userFromToken = (token) => {
  if (!token) return null;
  return q.findSession.get(token) || null;
};

const destroySession = (token) => {
  if (token) q.deleteSession.run(token);
};

const changePassword = (userId, currentPassword, newPassword) => {
  const user = q.userByIdWithHash.get(userId);
  if (!user || !verifyPassword(currentPassword, user.password_hash)) return false;
  q.updatePassword.run(bcrypt.hashSync(newPassword, 12), userId);
  // Toutes les autres sessions tombent : un mot de passe changé invalide
  // les sessions ouvertes ailleurs.
  q.deleteUserSessions.run(userId);
  return true;
};

module.exports = {
  COOKIE,
  TTL_HOURS,
  ensureBootstrapAdmin,
  authenticate,
  createSession,
  userFromToken,
  destroySession,
  changePassword,
  hashPassword,
};
