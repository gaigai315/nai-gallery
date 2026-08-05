import { createR2SignedGetUrl } from "../../_lib/r2-sign.js";
import { json, requireSession } from "../../_lib/session.js";

export async function onRequestGet({ request, env, params }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  // Look up by image_id only — covers are public to all logged-in users.
  // batch_id was never a meaningful filter here (the image is the image).
  const image = await env.DB.prepare(
    "SELECT preview_r2_key, r2_key FROM images WHERE image_id = ? AND is_active = 1",
  ).bind(params.image_id).first();
  if (!image) return json({ error: "not_found" }, 404);

  const key = image.preview_r2_key || image.r2_key;
  return Response.redirect(await createR2SignedGetUrl(env, key, 120), 302);
}
