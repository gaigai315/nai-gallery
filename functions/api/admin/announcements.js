import { json, requireAdmin } from "../../_lib/session.js";
import { readJson } from "../../_lib/request.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const rows = await env.DB.prepare(
    "SELECT id, title, content, image_url, is_active, sort_order, created_at FROM announcements ORDER BY sort_order ASC"
  ).all();

  return json({ announcements: rows.results || [] });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  const title = String(body?.title || "").trim();
  const content = String(body?.content || "").trim();
  if (!title || !content) return json({ error: "missing_fields" }, 400);

  const maxOrder = await env.DB.prepare(
    "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM announcements"
  ).first();

  const result = await env.DB.prepare(
    "INSERT INTO announcements (title, content, image_url, sort_order) VALUES (?, ?, ?, ?)"
  ).bind(title, content, body?.image_url || null, maxOrder.next).run();

  return json({ ok: true, id: result.meta?.last_row_id }, 201);
}
