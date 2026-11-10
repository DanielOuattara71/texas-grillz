/**
 * Journal des modifications : qui a changé quoi, quand.
 * Table `audit_log` (voir db.js). Ne jamais y écrire de mot de passe.
 */
const { db } = require("./db");

const insertAudit = db.prepare(
  "INSERT INTO audit_log (user_id, action, key, location_id, summary) VALUES (?, ?, ?, ?, ?)"
);

function audit(user, action, key, locationId, summary) {
  try {
    insertAudit.run(
      user && user.id ? Number(user.id) : null,
      String(action || "modification"),
      key ? String(key) : null,
      locationId ? String(locationId) : null,
      summary ? String(summary).slice(0, 500) : null
    );
  } catch (err) {
    // Le journal ne doit jamais casser une écriture métier.
    console.error("[audit]", err);
  }
}

module.exports = { audit, insertAudit };
