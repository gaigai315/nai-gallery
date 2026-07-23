import { readJson } from "../../../_lib/request.js";
import { json, requireAdmin } from "../../../_lib/session.js";

export async function onRequestDelete({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const batch = await env.DB.prepare("SELECT batch_id FROM batches WHERE batch_id = ?").bind(params.batch_id).first();
  if (!batch) return json({ error: "not_found" }, 404);

  // Collect all R2 keys before cascade delete
  const images = await env.DB.prepare(
    "SELECT r2_key, preview_r2_key, txt_key FROM images WHERE batch_id = ?"
  ).bind(params.batch_id).all();
  const keys = [];
  for (const img of images.results || []) {
    if (img.r2_key) keys.push(img.r2_key);
    if (img.preview_r2_key) keys.push(img.preview_r2_key);
    if (img.txt_key) keys.push(img.txt_key);
  }
  // Best-effort R2 cleanup
  for (const key of keys) {
    try { await env.GALLERY_BUCKET.delete(key); } catch (_) { /* best-effort */ }
  }

  // Cascade: foreign keys handle images, groups, favorites, unlocks, logs
  await env.DB.prepare("DELETE FROM batches WHERE batch_id = ?").bind(params.batch_id).run();
  return json({ ok: true, deleted_images: keys.length });
}

export async function onRequestPatch({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  const isActive = body?.is_active === undefined ? null : Number(Boolean(body.is_active));
  const expireAt = body?.expire_at === undefined ? undefined : body.expire_at || null;
  const coverImageId = body?.cover_image_id === undefined ? undefined : body.cover_image_id || null;
  const notes = body?.notes === undefined ? undefined : body.notes || null;

  const batch = await env.DB.prepare("SELECT batch_id FROM batches WHERE batch_id = ?").bind(params.batch_id).first();
  if (!batch) return json({ error: "not_found" }, 404);

  const sets = [];
  const values = [];
  if (isActive !== null) { sets.push("is_active = ?"); values.push(isActive); }
  if (expireAt !== undefined) { sets.push("expire_at = ?"); values.push(expireAt); }
  if (coverImageId !== undefined) { sets.push("cover_image_id = ?"); values.push(coverImageId); }
  if (notes !== undefined) { sets.push("notes = ?"); values.push(notes); }
  if (sets.length) {
    values.push(params.batch_id);
    await env.DB.prepare(`UPDATE batches SET ${sets.join(", ")} WHERE batch_id = ?`).bind(...values).run();
  }

  return json({ ok: true });
}
