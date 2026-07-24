import { json, requireSession } from "../../_lib/session.js";
import { createR2SignedGetUrl } from "../../_lib/r2-sign.js";

export async function onRequestGet({ request, env, params }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  const row = await env.DB.prepare(
    "SELECT id, title, content, images_json, files_json, created_at FROM vibe_posts WHERE id = ? AND is_active = 1"
  ).bind(Number(params.id)).first();

  if (!row) return json({ error: "not_found" }, 404);

  let images = [];
  let files = [];
  try { images = JSON.parse(row.images_json || "[]"); } catch {}
  try { files = JSON.parse(row.files_json || "[]"); } catch {}

  // Generate presigned URLs for images and files
  let imageUrls = [];
  let fileUrls = [];
  try {
    for (const key of images) {
      // images_json stores [{r2_key, file_name, ...}] or legacy string keys
      const r2key = typeof key === "string" ? key : key?.r2_key;
      if (r2key) {
        try {
          imageUrls.push(await createR2SignedGetUrl(env, r2key, 300));
        } catch {
          imageUrls.push("");
        }
      }
    }
    for (const f of files) {
      fileUrls.push({
        name: f.file_name || "download",
        size: f.file_size || 0,
        url: `/api/download/vibe/${row.id}/${encodeURIComponent(f.r2_key || "")}`,
      });
    }
  } catch {}

  return json({
    id: row.id,
    title: row.title,
    content: row.content || "",
    images: imageUrls,
    files: fileUrls,
    created_at: row.created_at,
  });
}
