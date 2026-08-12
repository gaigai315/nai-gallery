export const GUILD_WHITELIST_KEY = "guild_whitelist";
export const GUILD_BLACKLIST_KEY = "guild_blacklist";

export async function readGuildList(env, key) {
  try {
    const row = await env.DB.prepare("SELECT value FROM site_config WHERE key = ?").bind(key).first();
    if (!row?.value) return [];
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeGuildList(env, key, list) {
  await env.DB.prepare(
    "INSERT INTO site_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  )
    .bind(key, JSON.stringify(list))
    .run();
}

export function extractInviteCode(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const segments = url.pathname.split("/").filter(Boolean);
      return segments[segments.length - 1] || "";
    } catch {
      return "";
    }
  }
  return trimmed;
}

export function isDiscordSnowflake(value) {
  return /^\d{17,20}$/.test(String(value || "").trim());
}

export async function fetchMemberRoles(accessToken, guildId) {
  try {
    const resp = await fetch(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) return [];
    const member = await resp.json();
    return Array.isArray(member.roles) ? member.roles : [];
  } catch {
    return [];
  }
}
