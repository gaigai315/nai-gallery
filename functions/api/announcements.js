import { json } from "../_lib/session.js";

export async function onRequestGet({ env }) {
  const rows = await env.DB.prepare(
    "SELECT id, title, content, image_url, created_at FROM announcements WHERE is_active = 1 ORDER BY sort_order ASC"
  ).all();

  return json({ announcements: rows.results || [] });
}
