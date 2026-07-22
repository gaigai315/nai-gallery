import { readJson } from "../../../_lib/request.js";
import { json, requireAdmin } from "../../../_lib/session.js";

export async function onRequestPatch({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  const isActive = body?.is_active === undefined ? null : Number(Boolean(body.is_active));
  const expireAt = body?.expire_at === undefined ? undefined : body.expire_at || null;

  const batch = await env.DB.prepare("SELECT batch_id FROM batches WHERE batch_id = ?").bind(params.batch_id).first();
  if (!batch) return json({ error: "not_found" }, 404);

  if (isActive !== null && expireAt !== undefined) {
    await env.DB.prepare("UPDATE batches SET is_active = ?, expire_at = ? WHERE batch_id = ?")
      .bind(isActive, expireAt, params.batch_id)
      .run();
  } else if (isActive !== null) {
    await env.DB.prepare("UPDATE batches SET is_active = ? WHERE batch_id = ?").bind(isActive, params.batch_id).run();
  } else if (expireAt !== undefined) {
    await env.DB.prepare("UPDATE batches SET expire_at = ? WHERE batch_id = ?").bind(expireAt, params.batch_id).run();
  }

  return json({ ok: true });
}
