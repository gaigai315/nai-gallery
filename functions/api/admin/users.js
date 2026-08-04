import { json, requireAdmin } from "../../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const rows = await env.DB.prepare(
    `SELECT u.discord_id, u.username, u.avatar, u.role, u.created_at, u.updated_at,
            COUNT(DISTINCT ub.batch_id) AS unlock_count,
            COUNT(DISTINCT dl.id) AS download_count,
            MAX(ub.last_seen_at) AS last_active
     FROM users u
     LEFT JOIN user_batch_unlocks ub ON u.discord_id = ub.discord_id
     LEFT JOIN downloads_log dl ON u.discord_id = dl.discord_id
     GROUP BY u.discord_id
     ORDER BY u.created_at DESC`,
  ).all();

  return json({ users: rows.results || [] });
}
