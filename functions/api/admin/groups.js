import { json, requireAdmin } from "../../_lib/session.js";


export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await request.json();
  const { batch_id, title, notes } = body || {};

  if (!batch_id || !title) {
    return json({ error: "batch_id and title are required" }, 422);
  }

  const groupId = "grp-" + crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO prompt_groups (group_id, batch_id, title, notes, created_at) VALUES (?, ?, ?, ?, ?)`
  ).bind(groupId, batch_id, title, notes || "", new Date().toISOString()).run();

  return json({ ok: true, group_id: groupId });
}

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const groups = await env.DB.prepare(
    `SELECT g.group_id, g.batch_id, b.batch_name, g.title, g.notes,
            COUNT(i.image_id) AS image_count
     FROM prompt_groups g
     LEFT JOIN batches b ON g.batch_id = b.batch_id
     LEFT JOIN images i ON i.group_id = g.group_id
     GROUP BY g.group_id, g.batch_id, b.batch_name, g.title, g.notes
     ORDER BY b.created_at DESC, g.title ASC`
  ).all();

  return json({ groups: groups.results || [] });
}
