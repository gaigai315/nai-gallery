import { json, requireAdmin } from "../../_lib/session.js";
import { readJson } from "../../_lib/request.js";
import { createR2SignedGetUrl } from "../../_lib/r2-sign.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const rows = await env.DB.prepare(
    "SELECT id, title, content, images_json, files_json, is_active, created_at FROM vibe_posts ORDER BY created_at DESC"
  ).all();

  const posts = [];
  for (const p of (rows.results || [])) {
    let images = [];
    let files = [];
    try { images = JSON.parse(p.images_json || "[]"); } catch {}
    try { files = JSON.parse(p.files_json || "[]"); } catch {}
    let first_image = "";
    if (images.length > 0) {
      const r2key = typeof images[0] === "string" ? images[0] : images[0]?.r2_key;
      if (r2key) {
        try { first_image = await createR2SignedGetUrl(env, r2key, 300); } catch {}
      }
    }
    posts.push({
      id: p.id,
      title: p.title,
      content: p.content || "",
      image_count: images.length,
      file_count: files.length,
      first_image,
      is_active: p.is_active,
      created_at: p.created_at,
    });
  }

  return json({ posts });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  const title = String(body?.title || "").trim();
  if (!title) return json({ error: "missing_fields" }, 400);

  const result = await env.DB.prepare(
    "INSERT INTO vibe_posts (title, content, images_json, files_json) VALUES (?, ?, ?, ?)"
  ).bind(title, body?.content || "", body?.images_json || "[]", body?.files_json || "[]").run();

  return json({ ok: true, id: result.meta?.last_row_id }, 201);
}
