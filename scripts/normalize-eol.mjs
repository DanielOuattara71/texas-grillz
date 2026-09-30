// Normalise les fins de ligne en LF dans tout le projet (déjà décrit par .gitattributes).
// Usage : node scripts/normalize-eol.mjs
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SKIP = new Set(["node_modules", "dist", ".git", "coverage"]);
const TEXT = /\.(ts|tsx|js|mjs|cjs|css|json|md|html|svg)$/;

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (SKIP.has(name)) return [];
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

let changed = 0;
let scanned = 0;

for (const file of walk(".")) {
  if (!TEXT.test(file)) continue;
  scanned += 1;
  const before = readFileSync(file, "utf8");
  const after = before.replace(/\r\n/g, "\n");
  if (after !== before) {
    writeFileSync(file, after);
    changed += 1;
    console.log("  LF:", file);
  }
}

console.log(`analysés: ${scanned}, réécrits: ${changed}`);
