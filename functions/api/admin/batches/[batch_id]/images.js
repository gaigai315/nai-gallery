import { json, requireAdmin } from "../../../../_lib/session.js";

export async function onRequestGet({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const batchId = params.batch_id;
  const url = new URL(request.url);
  const groupId = url.searchParams.get("group_id") || "";
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
  const offset = Number(url.searchParams.get("offset") || 0);

  let where = "WHERE i.batch_id = ? AND i.is_active = 1";
  const bind = [batchId];
  if (groupId) { where += " AND i.group_id = ?"; bind.push(groupId); }

  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM images i ${where}`
  ).bind(...bind).first();

  const images = await env.DB.prepare(
    `SELECT i.image_id, i.group_id, COALESCE(g.title, '未分组') AS group_title,
            i.prompt_preview, i.seed, i.width, i.height,
            i.r2_key, i.preview_r2_key, i.created_at
     FROM images i
     LEFT JOIN prompt_groups g ON i.group_id = g.group_id
     ${where}
     ORDER BY i.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...bind, limit, offset).all();

  return json({ images: images.results || [], total: totalRow?.count || 0 });
}
