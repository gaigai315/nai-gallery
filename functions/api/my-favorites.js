import { json, requireSession } from "../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  const rows = await env.DB.prepare(
    `SELECT f.image_id, f.batch_id, f.timestamp AS favorited_at,
            b.batch_name,
            i.prompt_preview, i.width, i.height
     FROM favorites f
     JOIN images i ON i.image_id = f.image_id
     JOIN batches b ON b.batch_id = f.batch_id
     WHERE f.discord_id = ?
     ORDER BY f.timestamp DESC`
  )
    .bind(auth.session.discord_id)
    .all();

  const favorites = (rows.results || []).map((item) => ({
    ...item,
    preview_url: `/api/preview/${encodeURIComponent(item.image_id)}?batch_id=${encodeURIComponent(item.batch_id)}`,
  }));

  return json({ favorites });
}
