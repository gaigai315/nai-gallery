import { json, requireAdmin } from "../../../../_lib/session.js";

export async function onRequestGet({ request, env, params }) {
  try {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const imageId = decodeURIComponent(params.image_id);

  const rows = await env.DB.prepare(
    `SELECT d.discord_id, u.username, d.timestamp
     FROM downloads_log d
     JOIN users u ON u.discord_id = d.discord_id
     WHERE d.image_id = ?
     ORDER BY d.timestamp DESC`,
  ).bind(imageId).all();

  return json({ image_id: imageId, downloads: rows.results || [] });
  } catch (error) {
    console.error("image downloads failed", error);
    return json({ error: "internal_error", detail: String(error.message || "") }, 500);
  }
}
