import { hashPassword } from "../../../../_lib/password.js";
import { readJson } from "../../../../_lib/request.js";
import { json, requireAdmin } from "../../../../_lib/session.js";

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

  await env.DB.prepare(
    "UPDATE batches SET password_hash = ? WHERE batch_id = ?",
  )
    .bind(hash, params.batch_id)
    .run();

  return json({ password: newPassword });
}
