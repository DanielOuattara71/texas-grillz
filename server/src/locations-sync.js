/**
 * Synchronisation table `restaurants` (source de vérité) ↔ bloc content
 * `locations` (repli du site) et purge des contenus rattachés à un restaurant.
 *
 * Règle : quel que soit le chemin d'écriture (création, modification,
 * suppression, bascule actif/visible), les trois vues restent cohérentes :
 *   1. la table `restaurants` ;
 *   2. le bloc `locations` du contenu ;
 *   3. les blocs `<id>:<base>` qui référencent le restaurant (menu, hours…).
 */
const { db } = require("./db");
const { validateBlock } = require("./schemas");

const DEFAULT_HOURS = [
  { open: "12:00", close: "23:30" },
  { open: "12:00", close: "23:30" },
  { open: "12:00", close: "23:30" },
  { open: "12:00", close: "23:30" },
  { open: "12:00", close: "23:30" },
  { open: "12:00", close: "24:00" },
  { open: "12:00", close: "24:00" },
];

/** Lecture tolérante du bloc `locations` (liste vide si absent/corrompu). */
function readLocationsBlock() {
  try {
    const row = db.prepare("SELECT payload FROM content WHERE key = ?").get("locations");
    if (!row) return [];
    const list = JSON.parse(row.payload);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeLocationsBlock(list) {
  const checked = validateBlock("locations", list);
  if (!checked.ok) return checked;
  db.prepare(
    "INSERT INTO content (key, payload, updated_at) VALUES ('locations', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = datetime('now')"
  ).run(JSON.stringify(checked.data));
  return { ok: true };
}

/**
 * Insère ou fusionne une entrée dans le bloc. L'id est immuable : l'entrée
 * existante garde son `number` et son `schedule` ; le `published` suit le
 * champ `published` de la table.
 */
function upsertBlockEntry(entry) {
  const list = readLocationsBlock();
  const index = list.findIndex((e) => e && e.id === entry.id);
  if (index < 0) {
    const number = String(list.length + 1).padStart(2, "0");
    list.push({
      number,
      schedule: DEFAULT_HOURS,
      ...entry,
    });
  } else {
    const current = list[index];
    list[index] = {
      ...current,
      ...Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined)),
    };
  }
  return writeLocationsBlock(list);
}

function removeBlockEntry(id) {
  const list = readLocationsBlock();
  const next = list.filter((e) => !(e && e.id === id));
  if (next.length === list.length) return { ok: true };
  return writeLocationsBlock(next);
}

/** Supprime les blocs `<id>:<base>` rattachés au restaurant. */
function purgeRestaurantBlocks(id) {
  const result = db.prepare("DELETE FROM content WHERE key LIKE ?").run(`${id}:%`);
  return result.changes;
}

module.exports = {
  DEFAULT_HOURS,
  readLocationsBlock,
  writeLocationsBlock,
  upsertBlockEntry,
  removeBlockEntry,
  purgeRestaurantBlocks,
};
