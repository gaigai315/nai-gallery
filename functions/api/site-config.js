import { json } from "../_lib/session.js";

export async function onRequestGet({ env }) {
  const row = await env.DB.prepare(
    "SELECT value FROM site_config WHERE key = 'pledge_text'"
  ).first();

  return json({ pledge_text: row?.value || "" });
}
