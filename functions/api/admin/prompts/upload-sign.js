import { json, requireAdmin } from "../../../_lib/session.js";
import { readJson } from "../../../_lib/request.js";
import { createR2SignedPutUrl } from "../../../_lib/r2-sign.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  const postId = String(body?.post_id || "");
  const files = body?.files || [];

  if (!postId || !files.length) return json({ error: "missing_fields" }, 400);
  if (files.length > 20) return json({ error: "too_many_files" }, 400);

  const entries = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const ext = (f.file_name || "").split(".").pop() || "bin";
    const key = `prompts/${postId}/${Date.now()}_${i}.${ext}`;
    const url = await createR2SignedPutUrl(env, key, 600, f.content_type || "application/octet-stream");
    entries.push({ key, url, file_name: f.file_name, content_type: f.content_type });
  }

  return json({ entries });
}
