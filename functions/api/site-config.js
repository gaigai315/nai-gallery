import { json } from "../_lib/session.js";
import { createR2SignedGetUrl } from "../_lib/r2-sign.js";

export async function onRequestGet({ env }) {
  try {
  const { results } = await env.DB.prepare(
    "SELECT key, value FROM site_config"
  ).all();
  const config = {};
  for (const r of results) config[r.key] = r.value;

  let avatarUrl = "";
  let bgUrl = "";
  if (config.about_avatar_key) {
    try { avatarUrl = await createR2SignedGetUrl(env, config.about_avatar_key, 300); } catch {}
  }
  if (config.about_bg_key) {
    try { bgUrl = await createR2SignedGetUrl(env, config.about_bg_key, 300); } catch {}
  }

  return json({
    pledge_text: config.pledge_text || "",
    about_avatar_url: avatarUrl,
    about_bg_url: bgUrl,
    about_display_name: config.about_display_name || "",
    about_bio: config.about_bio || "",
    about_discord_links: config.about_discord_links || "[]",
    about_author_note: config.about_author_note || "",
  });
  } catch (error) {
    console.error("site-config fetch failed", error);
    return json({});
  }
}
