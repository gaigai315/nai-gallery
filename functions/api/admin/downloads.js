import { json, requireAdmin } from "../../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
  const offset = Number(url.searchParams.get("offset") || 0);
  const userFilter = url.searchParams.get("user") || "";
  const batchFilter = url.searchParams.get("batch") || "";

  let where = "WHERE 1=1";
  const params = [];

  if (userFilter) {
    where += " AND d.discord_id = ?";
    params.push(userFilter);
  }
  if (batchFilter) {
    where += " AND d.batch_id = ?";
    params.push(batchFilter);
  }

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM downloads_log d ${where}`,
  )
    .bind(...params)
    .first();

  const rows = await env.DB.prepare(
    `SELECT d.id, d.discord_id, d.batch_id, d.image_id, d.asset, d.timestamp, d.ip_hash,
            u.username, u.avatar,
            b.batch_name,
            i.prompt_preview
     FROM downloads_log d
     LEFT JOIN users u ON d.discord_id = u.discord_id
     LEFT JOIN batches b ON d.batch_id = b.batch_id
     LEFT JOIN images i ON d.image_id = i.image_id
     ${where}
     ORDER BY d.timestamp DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(...params, limit, offset)
    .all();

  return json({
    downloads: rows.results || [],
    total: countRow?.count || 0,
    offset,
    limit,
  });
}
