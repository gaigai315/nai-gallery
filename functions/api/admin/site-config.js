import { json, requireAdmin } from "../../_lib/session.js";
import { readJson } from "../../_lib/request.js";

export async function onRequestPut({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  const key = String(body?.key || "").trim();
  const value = String(body?.value ?? "");
  if (!key) return json({ error: "missing_key" }, 400);

  await env.DB.prepare(
    "INSERT INTO site_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).bind(key, value).run();

  return json({ ok: true });
}
