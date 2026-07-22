import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || true];
  }),
);

const batchId = String(args.id || "").trim();
const batchName = String(args.name || batchId).trim();
const manifestPath = args.manifest ? path.resolve(String(args.manifest)) : "";
const outPath = path.resolve(String(args.out || `batch-${batchId || "new"}.sql`));

if (!batchId || !batchName) {
  console.error("Usage: npm run batch:create -- --id=2026-05-16 --name=\"May 16\" --manifest=manifest.json");
  process.exit(1);
}

const password = args.password ? String(args.password) : crypto.randomBytes(18).toString("base64url");
const salt = crypto.randomBytes(16);
const iterations = 210000;
const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
const passwordHash = `pbkdf2-sha256$${iterations}$${salt.toString("hex")}$${hash.toString("hex")}`;
const now = new Date().toISOString();

const images = manifestPath ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : [];
if (!Array.isArray(images)) {
  console.error("Manifest must be a JSON array.");
  process.exit(1);
}

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

const lines = [
  "BEGIN TRANSACTION;",
  `INSERT INTO batches (batch_id, batch_name, password_hash, created_at, expire_at, is_active)
VALUES (${sqlString(batchId)}, ${sqlString(batchName)}, ${sqlString(passwordHash)}, ${sqlString(now)}, ${sqlString(args.expire_at)}, 1)
ON CONFLICT(batch_id) DO UPDATE SET batch_name = excluded.batch_name, password_hash = excluded.password_hash, expire_at = excluded.expire_at, is_active = 1;`,
];

for (const image of images) {
  const imageId = image.image_id || path.parse(image.r2_key || "").name;
  if (!imageId || !image.r2_key) {
    console.error("Each manifest item needs image_id or r2_key, and r2_key.");
    process.exit(1);
  }
  lines.push(`INSERT INTO images (
  image_id, batch_id, r2_key, preview_r2_key, txt_key, prompt_preview, width, height, created_at, is_active
) VALUES (
  ${sqlString(imageId)}, ${sqlString(batchId)}, ${sqlString(image.r2_key)}, ${sqlString(image.preview_r2_key)},
  ${sqlString(image.txt_key)}, ${sqlString(image.prompt_preview)}, ${Number(image.width) || "NULL"},
  ${Number(image.height) || "NULL"}, ${sqlString(image.created_at || now)}, 1
) ON CONFLICT(image_id) DO UPDATE SET
  batch_id = excluded.batch_id,
  r2_key = excluded.r2_key,
  preview_r2_key = excluded.preview_r2_key,
  txt_key = excluded.txt_key,
  prompt_preview = excluded.prompt_preview,
  width = excluded.width,
  height = excluded.height,
  is_active = 1;`);
}

lines.push("COMMIT;", "");
fs.writeFileSync(outPath, lines.join("\n"), "utf8");

console.log(`Wrote ${outPath}`);
console.log(`Batch password: ${password}`);
console.log("Store this password privately. Do not commit it.");
