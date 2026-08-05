import { json, requireAdmin } from "../../../../_lib/session.js";
import { decodePathParam } from "../../../../_lib/session.js";

export async function onRequestGet({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const batchId = decodePathParam(params.batch_id);
  const batch = await env.DB.prepare("SELECT batch_id FROM batches WHERE batch_id = ?")
    .bind(batchId).first();
  if (!batch) return json({ error: "not_found" }, 404);

  const unlockRows = await env.DB.prepare(
    `SELECT u.discord_id, us.username, u.unlocked_at
     FROM user_batch_unlocks u
     JOIN users us ON us.discord_id = u.discord_id
     WHERE u.batch_id = ?
     ORDER BY u.unlocked_at DESC`
  ).bind(batchId).all();

  const downloadRows = await env.DB.prepare(
    `SELECT d.discord_id, us.username, d.image_id, d.asset, d.timestamp
     FROM downloads_log d
     JOIN users us ON us.discord_id = d.discord_id
     WHERE d.batch_id = ?
     ORDER BY d.timestamp DESC
     LIMIT 50`
  ).bind(batchId).all();

  return json({
    batch_id: batchId,
    unlocks: unlockRows.results || [],
    downloads: downloadRows.results || [],
  });
}
