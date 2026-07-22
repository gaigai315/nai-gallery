import { clearSessionCookie, json } from "../_lib/session.js";

export async function onRequestPost({ env }) {
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(env) });
}
