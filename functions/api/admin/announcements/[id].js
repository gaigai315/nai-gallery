import { json, requireAdmin } from "../../../_lib/session.js";
import { readJson } from "../../../_lib/request.js";

export async function onRequestPatch({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  const id = Number(params.id);
  if (!id) return json({ error: "invalid_id" }, 400);

  const sets = [];
  const vals = [];
  for (const field of ["title", "content", "image_url", "is_active", "sort_order"]) {
    if (body[field] !== undefined) {
      sets.push(`${field} = ?`);
      vals.push(body[field]);
    }
  }
  if (!sets.length) return json({ error: "no_fields" }, 400);

  vals.push(id);
  await env.DB.prepare(`UPDATE announcements SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...vals).run();

  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const id = Number(params.id);
  if (!id) return json({ error: "invalid_id" }, 400);

  await env.DB.prepare("DELETE FROM announcements WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
