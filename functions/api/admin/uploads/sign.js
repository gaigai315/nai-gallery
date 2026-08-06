import { createR2SignedPutUrl } from "../../../_lib/r2-sign.js";
import { readJson } from "../../../_lib/request.js";
import { json, requireAdmin } from "../../../_lib/session.js";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "text/plain"]);

function extFor(kind, contentType) {
  if (kind === "preview") return "webp";
  if (kind === "txt") return "txt";
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  return "png";
}

function keyFor(batchId, imageId, kind, contentType) {
  const ext = extFor(kind, contentType);
  const folder = kind === "txt" ? "txt" : kind === "preview" ? "preview" : "original";
  return `batches/${batchId}/${folder}/${imageId}.${ext}`;
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  const batchId = String(body?.batch_id || "");
  const files = Array.isArray(body?.files) ? body.files : [];
  if (!batchId || !files.length) return json({ error: "bad_request" }, 400);

  const batch = await env.DB.prepare("SELECT batch_id FROM batches WHERE batch_id = ?").bind(batchId).first();
  if (!batch) return json({ error: "batch_not_found" }, 404);
  if (files.length > 600) return json({ error: "too_many_files" }, 400);

  const uploads = [];
  for (const file of files) {
    const imageId = String(file.image_id || "").replace(/[^a-zA-Z0-9_-]/g, "");
    const kind = ["original", "preview", "txt"].includes(file.kind) ? file.kind : "";
    const contentType = String(file.content_type || "application/octet-stream");
    if (!imageId || !kind || !ALLOWED_TYPES.has(contentType)) return json({ error: "invalid_file_manifest" }, 400);
    const key = keyFor(batchId, imageId, kind, contentType);
    uploads.push({
      image_id: imageId,
      kind,
      key,
      url: await createR2SignedPutUrl(env, key, 300, contentType),
      content_type: contentType,
    });
  }

  return json({ uploads });
}
