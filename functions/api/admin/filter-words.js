import { json, requireAdmin } from "../../_lib/session.js";
import { readJson } from "../../_lib/request.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const rows = await env.DB.prepare("SELECT word FROM filter_words ORDER BY id ASC").all();
  const words = (rows.results || []).map(r => r.word);

  return json({ words });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  const words = Array.isArray(body.words) ? body.words.map(w => String(w).trim()).filter(Boolean) : [];

  // Full replace: delete all, then insert new
  await env.DB.prepare("DELETE FROM filter_words").run();
  if (words.length > 0) {
    const placeholders = words.map(() => "(?)").join(", ");
    await env.DB.prepare(INSERT INTO filter_words (word) VALUES )
      .bind(...words).run();
  }

  return json({ ok: true, words });
}