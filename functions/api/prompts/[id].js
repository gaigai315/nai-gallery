import { json, requireSession } from "../../_lib/session.js";
import { createR2SignedGetUrl } from "../../_lib/r2-sign.js";

export async function onRequestGet({ request, env, params }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  const row = await env.DB.prepare(
    "SELECT id, title, content, params_json, images_json, created_at FROM prompt_posts WHERE id = ? AND is_active = 1"
  ).bind(Number(params.id)).first();

  if (!row) return json({ error: "not_found" }, 404);

  let images = [];
  let params = null;
  try { images = JSON.parse(row.images_json || "[]"); } catch {}
  try { params = JSON.parse(row.params_json || "null"); } catch {}

  let imageUrls = [];
  try {
    for (const key of images) {
      const r2key = typeof key === "string" ? key : key?.r2_key;
      if (r2key) {
        try {
          imageUrls.push(await createR2SignedGetUrl(env, r2key, 300));
        } catch {
          imageUrls.push("");
        }
      }
    }
  } catch {}

  return json({
    id: row.id,
    title: row.title,
    content: row.content,
    params: params,
    images: imageUrls,
    created_at: row.created_at,
  });
}
