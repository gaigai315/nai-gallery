
import { json, requireSession } from "../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0"));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));

  const [{ total }, rows] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) as total FROM wishes").first(),
    env.DB.prepare(
      "SELECT w.id, w.discord_id, w.username, w.avatar_url, w.content, w.images_json, w.created_at, COUNT(r.id) as reply_count FROM wishes w LEFT JOIN wish_replies r ON r.wish_id = w.id GROUP BY w.id ORDER BY w.created_at DESC LIMIT ? OFFSET ?"
    ).bind(limit, offset).all(),
  ]);

  const wishes = (rows.results || []).map((w) => {
    let images = [];
    try { images = JSON.parse(w.images_json || "[]"); } catch {}
    return {
      id: w.id,
      discord_id: w.discord_id,
      username: w.username || "",
      avatar_url: w.avatar_url || "",
      content: w.content,
      images,
      image_count: images.length,
      reply_count: w.reply_count || 0,
      created_at: w.created_at,
    };
  });

  return json({ wishes, total: total.total, offset, limit });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null);
  const content = String(body?.content || "").trim();
  if (!content) return json({ error: "missing_fields" }, 400);

  const discordId = auth.session.discord_id;
  const user = await env.DB.prepare("SELECT username, avatar_url FROM users WHERE discord_id = ?")
    .bind(discordId).first();

  const result = await env.DB.prepare(
    "INSERT INTO wishes (discord_id, username, avatar_url, content) VALUES (?, ?, ?, ?)"
  ).bind(discordId, user?.username || "", user?.avatar_url || "", content).run();

  return json({ ok: true, id: result.meta?.last_row_id }, 201);
}
