import { json, requireAdmin } from "../../../../_lib/session.js";

export async function onRequestGet({ request, env, params }) {
  try {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const discordId = decodeURIComponent(params.discord_id);

  const rows = await env.DB.prepare(
    `SELECT d.batch_id, b.batch_name, COUNT(DISTINCT d.image_id) AS image_count,
            MAX(d.timestamp) AS last_download
     FROM downloads_log d
     JOIN batches b ON b.batch_id = d.batch_id
     WHERE d.discord_id = ?
     GROUP BY d.batch_id
     ORDER BY last_download DESC`,
  ).bind(discordId).all();

  return json({ discord_id: discordId, batches: rows.results || [] });
  } catch (error) {
    console.error("user downloads failed", error);
    return json({ error: "internal_error", detail: String(error.message || "") }, 500);
  }
}
