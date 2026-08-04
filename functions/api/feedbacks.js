
import { json, requireSession } from "../_lib/session.js";
import { readJson } from "../_lib/request.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  const content = String(body?.content || "").trim();
  if (!content) return json({ error: "missing_fields" }, 400);

  const discordId = auth.session.discord_id;
  const user = await env.DB.prepare("SELECT username FROM users WHERE discord_id = ?")
    .bind(discordId).first();

  await env.DB.prepare(
    "INSERT INTO feedbacks (discord_id, username, content, images_json) VALUES (?, ?, ?, ?)"
  ).bind(discordId, user?.username || "", content, body?.images_json || "[]").run();

  return json({ ok: true }, 201);
}
