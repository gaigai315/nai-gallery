import { json, requireAdmin } from "../../../_lib/session.js";
import { readJson } from "../../../_lib/request.js";
import { createR2SignedPutUrl } from "../../../_lib/r2-sign.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  const fileName = String(body?.file_name || "image");
  const contentType = String(body?.content_type || "image/jpeg");
  const prefix = String(body?.prefix || "about");

  const ext = fileName.split(".").pop() || "jpg";
  const key = `about/${prefix}_${Date.now()}.${ext}`;
  const url = await createR2SignedPutUrl(env, key, 600, contentType);

  return json({ key, url });
}