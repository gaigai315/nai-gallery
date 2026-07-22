import { hasUnlock } from "../../_lib/db.js";
import { json, requireSession } from "../../_lib/session.js";

export async function onRequestGet({ request, env, params }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;
  if (!(await hasUnlock(env, auth.session.discord_id, params.batch_id))) return json({ error: "not_unlocked" }, 403);

  const batch = await env.DB.prepare(
    "SELECT batch_id, batch_name, created_at FROM batches WHERE batch_id = ? AND is_active = 1",
  )
    .bind(params.batch_id)
    .first();
  if (!batch) return json({ error: "not_found" }, 404);

  const rows = await env.DB.prepare(
    `SELECT i.image_id, i.batch_id, i.prompt_preview, i.width, i.height, i.created_at,
            CASE WHEN f.image_id IS NULL THEN 0 ELSE 1 END AS is_favorite
     FROM images i
     LEFT JOIN favorites f ON f.discord_id = ? AND f.batch_id = i.batch_id AND f.image_id = i.image_id
     WHERE i.batch_id = ? AND i.is_active = 1
     ORDER BY i.created_at ASC, i.image_id ASC`,
  )
    .bind(auth.session.discord_id, params.batch_id)
    .all();

  const images = (rows.results || []).map((image) => ({
    ...image,
    preview_url: `/api/preview/${encodeURIComponent(image.image_id)}?batch_id=${encodeURIComponent(params.batch_id)}`,
  }));
  return json({ batch, images });
}
