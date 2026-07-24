import { json, requireSession } from "../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  const rows = await env.DB.prepare(
    "SELECT id, title, content, params_json, images_json, created_at FROM prompt_posts WHERE is_active = 1 ORDER BY created_at DESC"
  ).all();

  const posts = (rows.results || []).map((p) => {
    let images = [];
    try { images = JSON.parse(p.images_json || "[]"); } catch {}
    return {
      id: p.id,
      title: p.title,
      content_preview: (p.content || "").slice(0, 80),
      image_count: images.length,
      first_image: images.length > 0 ? `/api/preview/prompt_${p.id}_0` : "",
      created_at: p.created_at,
    };
  });

  return json({ posts });
}
