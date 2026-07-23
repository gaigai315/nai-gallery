import { json, requireAdmin } from "../../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const groups = await env.DB.prepare(
    `SELECT g.group_id, g.batch_id, b.batch_name, g.title, g.notes
     FROM prompt_groups g
     LEFT JOIN batches b ON g.batch_id = b.batch_id
     ORDER BY b.created_at DESC, g.title ASC`
  ).all();

  return json({ groups: groups.results || [] });
}
