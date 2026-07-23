import { hasUnlock, logAction } from "../_lib/db.js";
import { requestAuditFields, readJson } from "../_lib/request.js";
import { json, requireSession } from "../_lib/session.js";
import { verifyPassword } from "../_lib/crypto.js";
import { checkLimit, rateLimitResponse } from "../_lib/rate-limit.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  const password = String(body?.password || "");
  if (!password) return json({ error: "invalid_password" }, 400);

  const audit = await requestAuditFields(request, env);
  const ipHash = audit.ip_hash || "unknown";
  const rl = checkLimit(`verify:${ipHash}`, 15_000, 5);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

  const batchId = String(body?.batch_id || "");
  let batch = null;

  if (batchId) {
    batch = await env.DB.prepare(
      "SELECT batch_id, batch_name, password_hash, expire_at FROM batches WHERE batch_id = ? AND is_active = 1",
    ).bind(batchId).first();
  } else {
    const batches = await env.DB.prepare(
      "SELECT batch_id, batch_name, password_hash, expire_at FROM batches WHERE is_active = 1 LIMIT 10",
    ).all();

    for (const row of batches.results || []) {
      const expired = row.expire_at && Date.parse(row.expire_at) < Date.now();
      if (expired) continue;
      if (await verifyPassword(password, row.password_hash)) {
        batch = row;
        break;
      }
    }
  }

  if (!batch) return json({ error: "invalid_password" }, 403);

  const expired = batch.expire_at && Date.parse(batch.expire_at) < Date.now();
  if (expired) return json({ error: "invalid_password" }, 403);

  const existed = await hasUnlock(env, auth.session.discord_id, batch.batch_id);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO user_batch_unlocks (discord_id, batch_id, unlocked_at, last_seen_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(discord_id, batch_id) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
  )
    .bind(auth.session.discord_id, batch.batch_id, now, now)
    .run();

  await logAction(env, {
    discord_id: auth.session.discord_id,
    batch_id: batch.batch_id,
    action: existed ? "unlock_refresh" : "unlock",
    ...audit,
  });

  return json({ batch: { batch_id: batch.batch_id, batch_name: batch.batch_name } });
}
