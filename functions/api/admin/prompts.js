import { json, requireAdmin } from "../../_lib/session.js";
import { readJson } from "../../_lib/request.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const rows = await env.DB.prepare(
    "SELECT id, title, content, params_json, images_json, is_active, created_at FROM prompt_posts ORDER BY created_at DESC"
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
      is_active: p.is_active,
      created_at: p.created_at,
    };
  });

  return json({ posts });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  const title = String(body?.title || "").trim();
  const content = String(body?.content || "").trim();
  if (!title || !content) return json({ error: "missing_fields" }, 400);

  const result = await env.DB.prepare(
    "INSERT INTO prompt_posts (title, content, params_json, images_json) VALUES (?, ?, ?, ?)"
  ).bind(title, content, body?.params_json || null, body?.images_json || "[]").run();

  return json({ ok: true, id: result.meta?.last_row_id }, 201);
}
