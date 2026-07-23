import { json, requireAdmin } from "../../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const [usersRow, unlocksRow, downloadsRow] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM users").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM user_batch_unlocks").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM downloads_log").first(),
  ]);

  return json({
    total_users: usersRow?.count || 0,
    total_unlocks: unlocksRow?.count || 0,
    total_downloads: downloadsRow?.count || 0,
  });
}
