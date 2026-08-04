
import { json, requireAdmin } from "../../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0"));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));

  const [{ total }, rows] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) as total FROM feedbacks").first(),
    env.DB.prepare(
      "SELECT id, discord_id, username, content, images_json, created_at FROM feedbacks ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).bind(limit, offset).all(),
  ]);

  const feedbacks = (rows.results || []).map((f) => {
    let images = [];
    try { images = JSON.parse(f.images_json || "[]"); } catch {}
    return {
      id: f.id,
      discord_id: f.discord_id,
      username: f.username || "",
      content: f.content,
      images,
      created_at: f.created_at,
    };
  });

  return json({ feedbacks, total: total.total, offset, limit });
}
