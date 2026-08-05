import { json, requireSession } from "../_lib/session.js";

export async function onRequestGet({ request, env }) {
  try {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const type = url.searchParams.get("type") || "prompt";

  if (!q) return json({ results: [] });

 if (type === "batch") {
    const rows = await env.DB.prepare(
      `SELECT b.batch_id, b.batch_name
       FROM batches b
       INNER JOIN user_batch_unlocks u ON u.batch_id = b.batch_id AND u.discord_id = ?
       WHERE b.batch_name LIKE ? AND b.is_active = 1
       ORDER BY b.batch_name ASC
       LIMIT 20`
    )
      .bind(auth.session.discord_id, `%${q}%`)
      .all();

    const results = (rows.results || []).map((b) => {
      const coverUrl = `/api/preview/${encodeURIComponent(b.batch_id)}?batch_id=${encodeURIComponent(b.batch_id)}`;
      return { ...b, cover_url: coverUrl, type: "batch" };
    });

    return json({ results });
  }

  if (type === "vibe") {
    const rows = await env.DB.prepare(
      `SELECT id, title, content FROM vibe_posts
       WHERE (title LIKE ? OR content LIKE ?) AND is_active = 1
       ORDER BY created_at DESC LIMIT 20`
    )
      .bind(`%${q}%`, `%${q}%`)
      .all();
    const results = (rows.results || []).map((p) => ({
      id: p.id, title: p.title,
      content_preview: (p.content || "").slice(0, 80),
      type: "vibe",
    }));
    return json({ results });
  }

  if (type === "prompt_post") {
    const rows = await env.DB.prepare(
      `SELECT id, title, content FROM prompt_posts
       WHERE (title LIKE ? OR content LIKE ?) AND is_active = 1
       ORDER BY created_at DESC LIMIT 20`
    )
      .bind(`%${q}%`, `%${q}%`)
      .all();
    const results = (rows.results || []).map((p) => ({
      id: p.id, title: p.title,
      content_preview: (p.content || "").slice(0, 80),
      type: "prompt_post",
    }));
    return json({ results });
  }

  // Default: search by prompt
  const rows = await env.DB.prepare(
    `SELECT i.image_id, i.batch_id, i.prompt_preview, b.batch_name
     FROM images i
     JOIN batches b ON i.batch_id = b.batch_id
     INNER JOIN user_batch_unlocks u ON u.batch_id = i.batch_id AND u.discord_id = ?
     WHERE i.prompt_preview LIKE ? AND i.is_active = 1
     ORDER BY i.created_at DESC
     LIMIT 30`
  )
    .bind(auth.session.discord_id, `%${q}%`)
    .all();

  const results = (rows.results || []).map((img) => ({
    ...img,
    preview_url: `/api/preview/${encodeURIComponent(img.image_id)}?batch_id=${encodeURIComponent(img.batch_id)}`,
    type: "prompt",
  }));

  return json({ results });
  } catch (error) {
    console.error("search failed", error);
    return json({ error: "internal_error", detail: String(error.message || "") }, 500);
  }
}
