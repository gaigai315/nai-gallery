import { hashPassword, randomToken, slugify } from "../../_lib/password.js";
import { readJson } from "../../_lib/request.js";
import { json, requireAdmin } from "../../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const rows = await env.DB.prepare(
    `SELECT b.batch_id, b.batch_name, b.created_at, b.expire_at, b.is_active, b.notes, b.cover_image_id,
            COUNT(DISTINCT i.image_id) AS image_count,
            COUNT(DISTINCT g.group_id) AS group_count,
            COUNT(DISTINCT u.discord_id) AS unlock_count,
            COUNT(d.id) AS download_count
     FROM batches b
     LEFT JOIN images i ON i.batch_id = b.batch_id
     LEFT JOIN prompt_groups g ON g.batch_id = b.batch_id
     LEFT JOIN user_batch_unlocks u ON u.batch_id = b.batch_id
     LEFT JOIN downloads_log d ON d.batch_id = b.batch_id
     GROUP BY b.batch_id
     ORDER BY b.created_at DESC`,
  ).all();
  return json({ batches: rows.results || [] });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  const batchName = String(body?.batch_name || "").trim();
  if (!batchName) return json({ error: "batch_name_required" }, 400);

  const batchId = `${slugify(body?.batch_id || batchName)}-${randomToken(5)}`;
  const password = randomToken(18);
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  await env.DB.prepare(
`INSERT INTO batches (batch_id, batch_name, password_hash, created_at, expire_at, is_active)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
  )
    .bind(batchId, batchName, passwordHash, now, body?.expire_at || null, body?.notes || null)
    .run();

  return json({ batch_id: batchId, batch_name: batchName, password });
}
