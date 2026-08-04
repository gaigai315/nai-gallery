import { json, requireAdmin } from "../../../_lib/session.js";

export async function onRequestPatch({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const { role } = body;
  if (!role || !["user", "admin"].includes(role)) {
    return json({ error: "invalid_role" }, 400);
  }

  if (params.discord_id === auth.session.discord_id && role !== "admin") {
    return json({ error: "cannot_demote_self" }, 400);
  }

  const result = await env.DB.prepare(
    "UPDATE users SET role = ?, updated_at = ? WHERE discord_id = ?",
  )
    .bind(role, new Date().toISOString(), params.discord_id)
    .run();

  if (result.changes === 0) {
    return json({ error: "not_found" }, 404);
  }

  return json({ ok: true });
}
