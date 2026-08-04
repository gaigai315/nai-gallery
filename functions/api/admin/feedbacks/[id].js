import { json, requireAdmin } from "../../../_lib/session.js";

export async function onRequestDelete({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const id = Number(params.id);
  if (!id) return json({ error: "invalid_id" }, 400);

  await env.DB.prepare("DELETE FROM feedbacks WHERE id = ?").bind(id).run();
  return json({ ok: true });
}