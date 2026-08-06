import { json, requireAdmin } from '../../../_lib/session.js';

// POST /api/admin/users/ban — 拉黑用户
export async function onRequestPost({ request, env }) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.response) return auth.response;

    const body = await request.json().catch(() => ({}));
    const discordId = String(body?.discord_id || '').trim();
    if (!discordId) return json({ error: 'missing_fields' }, 400);

    const reason = String(body?.reason || '').trim();
    const adminId = auth.session.discord_id;

    await env.DB.prepare(
      'INSERT OR REPLACE INTO banned_users (discord_id, banned_at, banned_by, reason) VALUES (?, ?, ?, ?)'
    ).bind(discordId, new Date().toISOString(), adminId, reason).run();

    return json({ ok: true });
  } catch (err) {
    console.error('ban POST error:', err);
    return json({ error: 'server_error', detail: err.message }, 500);
  }
}

// DELETE /api/admin/users/ban — 解封用户
export async function onRequestDelete({ request, env }) {
  try {
    const auth = await requireAdmin(request, env);
    if (auth.response) return auth.response;

    const url = new URL(request.url);
    const discordId = url.searchParams.get('discord_id');
    if (!discordId) return json({ error: 'missing_fields' }, 400);

    await env.DB.prepare('DELETE FROM banned_users WHERE discord_id = ?')
      .bind(discordId).run();

    return json({ ok: true });
  } catch (err) {
    console.error('ban DELETE error:', err);
    return json({ error: 'server_error', detail: err.message }, 500);
  }
}
