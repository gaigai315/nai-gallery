import { hasUnlock, logAction } from "../_lib/db.js";
import { requestAuditFields, readJson } from "../_lib/request.js";
import { json, requireSession } from "../_lib/session.js";
import { checkLimit, rateLimitResponse } from "../_lib/rate-limit.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  const batchId = String(body?.batch_id || "");
  const imageId = String(body?.image_id || "");
  const favorite = Boolean(body?.favorite);
  if (!batchId || !imageId) return json({ error: "bad_request" }, 400);
  if (!(await hasUnlock(env, auth.session.discord_id, batchId))) return json({ error: "not_unlocked" }, 403);

  const favKey = `fav:${auth.session.discord_id}`;
  const fv = checkLimit(favKey, 60_000, 10);
  if (!fv.allowed) return rateLimitResponse(fv.retryAfter);

  if (favorite) {
    await env.DB.prepare(
      `INSERT INTO favorites (discord_id, batch_id, image_id, timestamp)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(discord_id, batch_id, image_id) DO UPDATE SET timestamp = excluded.timestamp`,
    )
      .bind(auth.session.discord_id, batchId, imageId, new Date().toISOString())
      .run();
  } else {
    await env.DB.prepare("DELETE FROM favorites WHERE discord_id = ? AND batch_id = ? AND image_id = ?")
      .bind(auth.session.discord_id, batchId, imageId)
      .run();
  }

  await logAction(env, {
    discord_id: auth.session.discord_id,
    batch_id: batchId,
    image_id: imageId,
    action: favorite ? "favorite" : "unfavorite",
    ...(await requestAuditFields(request, env)),
  });

  return json({ favorite });
}
