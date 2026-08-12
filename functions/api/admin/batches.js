import { hashPassword, randomToken, slugify } from "../../_lib/password.js";
import { readJson } from "../../_lib/request.js";
import { json, requireAdmin } from "../../_lib/session.js";

export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.response) return auth.response;

    const rows = await env.DB.prepare(
      `SELECT b.batch_id, b.batch_name, b.created_at, b.expire_at, b.is_active, b.notes, b.cover_image_id,
              (SELECT COUNT(*) FROM images WHERE batch_id = b.batch_id) AS image_count,
              (SELECT COUNT(*) FROM prompt_groups WHERE batch_id = b.batch_id) AS group_count,
              (SELECT COUNT(*) FROM user_batch_unlocks WHERE batch_id = b.batch_id) AS unlock_count,
              (SELECT COUNT(*) FROM downloads_log WHERE batch_id = b.batch_id) AS download_count
       FROM batches b
       ORDER BY b.created_at DESC`,
    ).all();
    return json({ batches: rows.results || [] });
  } catch (error) {
    console.error("list batches failed", error);
    return json({ error: "internal_error", detail: error instanceof Error ? error.message : String(error) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  try {
    const body = await readJson(request);
    const batchName = String(body?.batch_name || "").trim();
    if (!batchName) return json({ error: "batch_name_required" }, 400);

    const batchId = `${slugify(body?.batch_id || batchName)}-${randomToken(5)}`;
    const password = randomToken(18);
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO batches (batch_id, batch_name, password_hash, created_at, expire_at, is_active, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(batchId, batchName, passwordHash, now, body?.expire_at || null, 0, body?.notes || null)
      .run();

    return json({ batch_id: batchId, batch_name: batchName, password });
  } catch (error) {
    console.error("create batch failed", error);
    return json({
      error: "batch_create_failed",
      detail: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}
