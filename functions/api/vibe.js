import { json, requireSession } from "../_lib/session.js";
import { createR2SignedGetUrl } from "../_lib/r2-sign.js";

export async function onRequestGet({ request, env }) {
  try {
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

  const posts = await Promise.all((rows.results || []).map(async (p) => {
    let images = [];
    let files = [];
    try { images = JSON.parse(p.images_json || "[]"); } catch {}
    try { files = JSON.parse(p.files_json || "[]"); } catch {}

    const firstImage = images[0];
    const firstImageKey = typeof firstImage === "string" ? firstImage : firstImage?.r2_key;
    let firstImageUrl = "";
    if (firstImageKey) {
      try { firstImageUrl = await createR2SignedGetUrl(env, firstImageKey, 300); } catch {}
    }

    return {
      id: p.id,
      title: p.title,
      content: p.content || "",
      image_count: images.length,
      file_count: files.length,
      first_image: firstImageUrl,
      created_at: p.created_at,
    };
  }));

  return json({ posts, total: countRow?.count || 0, offset, limit });
  } catch (error) {
    console.error("vibe fetch failed", error);
    return json({ error: "internal_error", detail: String(error.message || "") }, 500);
  }
}
