import { json, requireAdmin } from "../../_lib/session.js";
import { readJson } from "../../_lib/request.js";

export async function onRequestPut({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);

  const fields = {
    about_avatar_key: body.avatar_key,
    about_bg_key: body.bg_key,
    about_display_name: body.display_name,
    about_bio: body.bio,
    about_discord_links: body.discord_links,
    about_author_note: body.author_note,
  };

  const stmt = env.DB.prepare(
    "INSERT INTO site_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );

  const batch = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) batch.push(stmt.bind(key, String(value)));
  }

  if (batch.length) await env.DB.batch(batch);

  return json({ ok: true });
}
