import { hasUnlock, isAdmin } from "../../_lib/db.js";
import { decodePathParam, json, requireSession } from "../../_lib/session.js";

export async function onRequestGet({ request, env, params }) {
  try {
  const auth = await requireSession(request, env);
  const batchId = decodePathParam(params.batch_id);
  if (auth.response) return auth.response;
  const admin = await isAdmin(env, auth.session.discord_id);
  if (!admin && !(await hasUnlock(env, auth.session.discord_id, batchId))) return json({ error: "not_unlocked" }, 403);

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
  const offset = Number(url.searchParams.get("offset") || 0);

  let batchSql = "SELECT batch_id, batch_name, created_at, notes FROM batches WHERE batch_id = ?";
  if (!admin) batchSql += " AND is_active = 1";
  const batch = await env.DB.prepare(batchSql)
    .bind(batchId)
    .first();
  if (!batch) return json({ error: "not_found" }, 404);

  // Admin sees all images regardless of is_active;
  // non-admin only sees active images.
  // NOTE: COUNT 查询里 FROM images 没有别名 i，这里不能用 i.is_active（会报
  // "no such column: i.is_active"）；主查询有别名 i，未限定列名同样合法。
  const activeClause = admin ? "1=1" : "is_active = 1";

  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM images WHERE batch_id = ? AND ${activeClause}`
  ).bind(batchId).first();

  const groups = await env.DB.prepare(
    "SELECT group_id, title, notes, positive_prompt, negative_prompt, params_json FROM prompt_groups WHERE batch_id = ?",
  )
    .bind(batchId)
    .all();

  const rows = await env.DB.prepare(
    `SELECT i.image_id, i.batch_id, i.prompt_preview, i.width, i.height, i.created_at,
            i.group_id, i.metadata_json, g.title AS group_title,
            g.positive_prompt, g.negative_prompt, g.params_json,
            CASE WHEN f.image_id IS NULL THEN 0 ELSE 1 END AS is_favorite
     FROM images i
     LEFT JOIN prompt_groups g ON g.group_id = i.group_id
     LEFT JOIN favorites f ON f.discord_id = ? AND f.batch_id = i.batch_id AND f.image_id = i.image_id
     WHERE i.batch_id = ? AND ${activeClause}
     ORDER BY i.created_at ASC, i.image_id ASC
     LIMIT ? OFFSET ?`,
  )
    .bind(auth.session.discord_id, batchId, limit, offset)
    .all();

  const images = (rows.results || []).map((image) => {
    let prompt_preview = image.prompt_preview;
    if (!prompt_preview && image.metadata_json) {
      try {
        const meta = JSON.parse(image.metadata_json);
        prompt_preview = meta.prompt || null;
      } catch {}
    }
    return {
      ...image,
      prompt_preview: prompt_preview || image.positive_prompt || null,
      preview_url: `/api/preview/${encodeURIComponent(image.image_id)}?batch_id=${encodeURIComponent(batchId)}`,
    };
  });
  return json({
    batch,
    images,
    groups: groups.results || [],
    total: totalRow?.count || 0,
    offset,
    limit,
  });
  } catch (error) {
    console.error("gallery fetch failed", error);
    return json({ error: "internal_error", detail: String(error.message || "") }, 500);
  }
}
