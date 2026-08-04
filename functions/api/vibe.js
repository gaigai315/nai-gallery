import { json, requireSession } from "../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
  const offset = Number(url.searchParams.get("offset") || 0);

  const countRow = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM vibe_posts WHERE is_active = 1"
  ).first();

  const rows = await env.DB.prepare(
    "SELECT id, title, content, images_json, files_json, created_at FROM vibe_posts WHERE is_active = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?"
  ).bind(limit, offset).all();

  const posts = (rows.results || []).map((p) => {
    let images = [];
    let files = [];
    try { images = JSON.parse(p.images_json || "[]"); } catch {}
    try { files = JSON.parse(p.files_json || "[]"); } catch {}
    return {
      id: p.id,
      title: p.title,
      content: p.content || "",
      image_count: images.length,
      file_count: files.length,
      first_image: images.length > 0 ? `/api/preview/vibe_${p.id}_0` : "",
      created_at: p.created_at,
    };
  });

  return json({ posts, total: countRow?.count || 0, offset, limit });
}