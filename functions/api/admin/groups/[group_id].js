import { json, requireAdmin } from "../../../_lib/session.js";

export async function onRequestDelete({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const groupId = String(params.group_id || "");
  const group = await env.DB.prepare(
    `SELECT g.group_id, COUNT(i.image_id) AS image_count
     FROM prompt_groups g
     LEFT JOIN images i ON i.group_id = g.group_id
     WHERE g.group_id = ?
     GROUP BY g.group_id`
  ).bind(groupId).first();

  if (!group) return json({ error: "not_found" }, 404);
  if (Number(group.image_count) > 0) {
    return json({ error: "group_not_empty", image_count: Number(group.image_count) }, 409);
  }

  // Keep the empty check in the DELETE so a concurrent upload cannot be orphaned.
  const result = await env.DB.prepare(
    `DELETE FROM prompt_groups
     WHERE group_id = ?
       AND NOT EXISTS (SELECT 1 FROM images WHERE group_id = ?)`
  ).bind(groupId, groupId).run();

  if (!result.meta?.changes) return json({ error: "group_not_empty" }, 409);
  return json({ ok: true });
}
