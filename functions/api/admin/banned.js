import { json, requireAdmin } from '../../_lib/session.js';

// GET /api/admin/banned
export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.response) return auth.response;

    const { results } = await env.DB.prepare(
      "SELECT b.discord_id, b.banned_at, b.banned_by, b.reason, u.username, u.role FROM banned_users b LEFT JOIN users u ON u.discord_id = b.discord_id ORDER BY b.banned_at DESC"
    ).all();

    return json({ banned: results });
  } catch (err) {
    console.error('banned list error:', err);
    return json({ error: 'server_error', detail: err.message }, 500);
  }
}
