import { decryptPassword, encryptPassword, hashPassword } from "../../../../_lib/password.js";
import { readJson } from "../../../../_lib/request.js";
import { decodePathParam, json, requireAdmin } from "../../../../_lib/session.js";

export async function onRequestGet({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const batchId = decodePathParam(params.batch_id);
  const batch = await env.DB.prepare(
    "SELECT password_secret FROM batches WHERE batch_id = ?",
  )
    .bind(batchId)
    .first();
  if (!batch) return json({ error: "not_found" }, 404);

  const password = await decryptPassword(batch.password_secret, env.SESSION_SECRET);
  return json({ password, recoverable: Boolean(password) });
}

export async function onRequestPost({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  let newPassword = String(body?.password || "").trim();
  if (newPassword.length > 128) return json({ error: "password_too_long" }, 400);

  // Empty input keeps the convenient random-password behavior.
  if (!newPassword) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    newPassword = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  const hash = await hashPassword(newPassword);
  const passwordSecret = await encryptPassword(newPassword, env.SESSION_SECRET);
  const batchId = decodePathParam(params.batch_id);

  const result = await env.DB.prepare(
    "UPDATE batches SET password_hash = ?, password_secret = ? WHERE batch_id = ?",
  )
    .bind(hash, passwordSecret, batchId)
    .run();
  if (!result.meta?.changes) return json({ error: "not_found" }, 404);

  return json({ password: newPassword });
}
