import { hasUnlock } from "../../_lib/db.js";
import { createR2SignedGetUrl } from "../../_lib/r2-sign.js";
import { json, requireSession } from "../../_lib/session.js";

export async function onRequestGet({ request, env, params }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const batchId = url.searchParams.get("batch_id");
  if (!batchId || !(await hasUnlock(env, auth.session.discord_id, batchId))) return json({ error: "not_unlocked" }, 403);

  const image = await env.DB.prepare(
    "SELECT preview_r2_key, r2_key FROM images WHERE image_id = ? AND batch_id = ? AND is_active = 1",
  )
    .bind(params.image_id, batchId)
    .first();
  if (!image) return json({ error: "not_found" }, 404);
  const key = image.preview_r2_key || image.r2_key;
  const signedUrl = await createR2SignedGetUrl(env, key, 120);
  return Response.redirect(signedUrl, 302);
}
