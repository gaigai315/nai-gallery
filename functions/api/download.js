import { hasUnlock, isAdmin, logAction } from "../_lib/db.js";
import { requestAuditFields, readJson } from "../_lib/request.js";
import { createR2SignedGetUrl } from "../_lib/r2-sign.js";
import { json, requireSession } from "../_lib/session.js";
import { checkLimit, rateLimitResponse } from "../_lib/rate-limit.js";

export async function onRequestPost({ request, env }) {
  try {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  const batchId = String(body?.batch_id || "");
  const imageId = String(body?.image_id || "");
  const asset = body?.asset === "txt" ? "txt" : "image";
  if (!batchId || !imageId) return json({ error: "bad_request" }, 400);
  const admin = await isAdmin(env, auth.session.discord_id);
  if (!admin && !(await hasUnlock(env, auth.session.discord_id, batchId))) return json({ error: "not_unlocked" }, 403);

  const dlKey = `dl:${auth.session.discord_id}`;
  const dl = checkLimit(dlKey, 30_000, 3);
  if (!dl.allowed) return rateLimitResponse(dl.retryAfter);

  const limit = Number(env.DOWNLOAD_LIMIT_PER_HOUR || 30);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM access_logs
     WHERE discord_id = ? AND batch_id = ? AND action = 'download' AND timestamp > ?`,
  )
    .bind(auth.session.discord_id, batchId, since)
    .first();
  if (Number(countRow?.count || 0) >= limit) return json({ error: "rate_limited" }, 429);

  const image = await env.DB.prepare(
    "SELECT r2_key, txt_key FROM images WHERE image_id = ? AND batch_id = ? AND is_active = 1",
  )
    .bind(imageId, batchId)
    .first();
  if (!image) return json({ error: "not_found" }, 404);
  const objectKey = asset === "txt" ? image.txt_key : image.r2_key;
  if (!objectKey) return json({ error: "asset_missing" }, 404);

  const audit = await requestAuditFields(request, env);
  await logAction(env, {
    discord_id: auth.session.discord_id,
    batch_id: batchId,
    image_id: imageId,
    action: "download",
    ...audit,
  });
  await env.DB.prepare(
    `INSERT INTO downloads_log (discord_id, batch_id, image_id, asset, timestamp, ip_hash, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(auth.session.discord_id, batchId, imageId, asset, new Date().toISOString(), audit.ip_hash, audit.user_agent)
    .run();

  const ttl = Math.min(Math.max(Number(env.DOWNLOAD_URL_TTL_SECONDS || 120), 30), 180);
  const url = await createR2SignedGetUrl(env, objectKey, ttl);
  return json({ url, expires_in: ttl });
  } catch (error) {
    console.error("download failed", error);
    return json({ error: "internal_error", detail: String(error.message || "") }, 500);
  }
}
