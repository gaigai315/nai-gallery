import { createR2SignedGetUrl } from "../../../_lib/r2-sign.js";
import { json, requireAdmin } from "../../../_lib/session.js";

export async function onRequestGet({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  // Admin preview — look up by image_id only.
  // batch_id param is kept for UI compatibility but not used as a filter.
  const image = await env.DB.prepare(
    "SELECT preview_r2_key, r2_key FROM images WHERE image_id = ?",
  ).bind(params.image_id).first();
  if (!image) return json({ error: "not_found" }, 404);

  const key = image.preview_r2_key || image.r2_key;
  return Response.redirect(await createR2SignedGetUrl(env, key, 600), 302);
}
