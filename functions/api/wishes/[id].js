
import { json, requireSession } from "../../_lib/session.js";
import { readJson } from "../../_lib/request.js";
import { createR2SignedGetUrl } from "../../_lib/r2-sign.js";

export async function onRequestGet({ request, env, params }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  const id = Number(params.id);
  if (!id) return json({ error: "invalid_id" }, 400);

  const row = await env.DB.prepare(
    "SELECT id, discord_id, username, avatar_url, content, images_json, created_at FROM wishes WHERE id = ?"
  ).bind(id).first();

  if (!row) return json({ error: "not_found" }, 404);

  let images = [];
  try { images = JSON.parse(row.images_json || "[]"); } catch {}

  let imageUrls = [];
  try {
    for (const img of images) {
      const r2key = img?.r2_key;
      if (r2key) {
        imageUrls.push(await createR2SignedGetUrl(env, r2key, 300));
      }
    }
  } catch {}

  const replies = await env.DB.prepare(
    "SELECT id, discord_id, username, avatar_url, content, created_at FROM wish_replies WHERE wish_id = ? ORDER BY created_at ASC"
  ).bind(id).all();

  return json({
    id: row.id,
    discord_id: row.discord_id,
    username: row.username || "",
    avatar_url: row.avatar_url || "",
    content: row.content,
    images: imageUrls,
    created_at: row.created_at,
    replies: (replies.results || []).map((r) => ({
      id: r.id,
      discord_id: r.discord_id,
      username: r.username || "",
      avatar_url: r.avatar_url || "",
      content: r.content,
      created_at: r.created_at,
    })),
  });
}

export async function onRequestPatch({ request, env, params }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  const id = Number(params.id);
  if (!id) return json({ error: "invalid_id" }, 400);

  const row = await env.DB.prepare("SELECT discord_id FROM wishes WHERE id = ?").bind(id).first();
  if (!row) return json({ error: "not_found" }, 404);
  if (row.discord_id !== auth.session.discord_id) {
    return json({ error: "forbidden" }, 403);
  }

  const body = await readJson(request);
  if (!body || body.images_json === undefined) return json({ error: "no_fields" }, 400);

  await env.DB.prepare("UPDATE wishes SET images_json = ? WHERE id = ?")
    .bind(body.images_json || "[]", id).run();

  return json({ ok: true });
}
