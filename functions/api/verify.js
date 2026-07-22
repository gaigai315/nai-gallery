import { hasUnlock, logAction } from "../_lib/db.js";
import { requestAuditFields, readJson } from "../_lib/request.js";
import { json, requireSession } from "../_lib/session.js";
import { verifyPassword } from "../_lib/crypto.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  const password = String(body?.password || "");
  if (!password) return json({ error: "invalid_password" }, 400);

  const batches = await env.DB.prepare(
    "SELECT batch_id, batch_name, password_hash, expire_at FROM batches WHERE is_active = 1",
  ).all();

  let matched = null;
  for (const batch of batches.results || []) {
    const expired = batch.expire_at && Date.parse(batch.expire_at) < Date.now();
    if (!expired && (await verifyPassword(password, batch.password_hash))) {
      matched = batch;
      break;
    }
  }

  if (!matched) return json({ error: "invalid_password" }, 403);

  const existed = await hasUnlock(env, auth.session.discord_id, matched.batch_id);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO user_batch_unlocks (discord_id, batch_id, unlocked_at, last_seen_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(discord_id, batch_id) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
  )
    .bind(auth.session.discord_id, matched.batch_id, now, now)
    .run();

  await logAction(env, {
    discord_id: auth.session.discord_id,
    batch_id: matched.batch_id,
    action: existed ? "unlock_refresh" : "unlock",
    ...(await requestAuditFields(request, env)),
  });

  return json({ batch: { batch_id: matched.batch_id, batch_name: matched.batch_name } });
}
