import { json, requireAdmin } from "../../../_lib/session.js";
import { readJson } from "../../../_lib/request.js";

export async function onRequestPatch({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const image = await env.DB.prepare(
    "SELECT image_id FROM images WHERE image_id = ?"
  ).bind(params.image_id).first();
  if (!image) return json({ error: "not_found" }, 404);

  const body = await readJson(request);
  const sets = [];
  const bind = [];
  for (const f of ["group_id", "r2_key", "preview_r2_key", "width", "height"]) {
    if (body[f] !== undefined) {
      sets.push(`${f} = ?`);
      bind.push(body[f]);
    }
  }
  if (!sets.length) return json({ error: "no_fields" }, 400);

  bind.push(params.image_id);
  await env.DB.prepare(`UPDATE images SET ${sets.join(", ")} WHERE image_id = ?`)
    .bind(...bind).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const image = await env.DB.prepare(
    "SELECT image_id, r2_key, preview_r2_key, txt_key FROM images WHERE image_id = ?"
  ).bind(params.image_id).first();
  if (!image) return json({ error: "not_found" }, 404);

  // Best-effort R2 cleanup
  const keys = [image.r2_key, image.preview_r2_key, image.txt_key].filter(Boolean);
  for (const key of keys) {
    try { await env.GALLERY_BUCKET.delete(key); } catch (_) { /* best-effort */ }
  }

  // Cascade: foreign keys handle favorites, downloads_log, access_logs
  await env.DB.prepare("DELETE FROM images WHERE image_id = ?").bind(params.image_id).run();
  return json({ ok: true });
}
