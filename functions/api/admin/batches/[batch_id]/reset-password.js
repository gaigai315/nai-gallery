import { hashPassword } from "../../../_lib/password.js";
import { json, requireAdmin } from "../../../_lib/session.js";

export async function onRequestPost({ request, env, params }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  // Generate a new random password (16 hex chars = 8 bytes)
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const newPassword = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

  const hash = await hashPassword(newPassword);

  await env.DB.prepare(
    "UPDATE batches SET password_hash = ? WHERE batch_id = ?",
  )
    .bind(hash, params.batch_id)
    .run();

  return json({ password: newPassword });
}