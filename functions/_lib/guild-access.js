export const GUILD_WHITELIST_KEY = "guild_whitelist";
export const GUILD_BLACKLIST_KEY = "guild_blacklist";

const DISCORD_API = "https://discord.com/api";
const DISCORD_RETRY_LIMIT = 3;
// Discord rate-limits GET /users/@me/guilds/{id}/member to 10 requests per
// 10 seconds. We spread member lookups out with a small token bucket so a
// user who is in many of the configured servers does not burst past the
// limit and get kicked out during login.
const MEMBER_RATE_LIMIT = 10;
const MEMBER_RATE_WINDOW_MS = 10_000;

let memberTokens = MEMBER_RATE_LIMIT;
let memberWindowStart = Date.now();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function discordFetch(path, accessToken, attempts = DISCORD_RETRY_LIMIT) {
  let last;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const resp = await fetch(`${DISCORD_API}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    last = resp;
    if (resp.status !== 429) return resp;
    const raw = resp.headers.get("Retry-After") || resp.headers.get("X-RateLimit-Reset-After") || "1";
    const parsed = Number(raw);
    // Member endpoints commonly ask for ~10s; capping at 5s made retries spin
    // and fail repeatedly for users in many guilds.
    const waitSeconds = Number.isFinite(parsed) ? Math.min(15, Math.max(0.5, parsed)) : 1;
    await sleep(waitSeconds * 1000);
  }
  return last;
}

async function waitForMemberToken() {
  while (true) {
    const now = Date.now();
    const elapsed = now - memberWindowStart;
    if (elapsed >= MEMBER_RATE_WINDOW_MS) {
      memberTokens = MEMBER_RATE_LIMIT;
      memberWindowStart = now;
      continue;
    }
    if (memberTokens > 0) {
      memberTokens -= 1;
      return;
    }
    await sleep(MEMBER_RATE_WINDOW_MS - elapsed);
  }
}

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

export async function fetchUserGuilds(accessToken) {
  const guilds = [];
  let after = "";
  for (let page = 0; page < 10; page++) {
    const query = `limit=200${after ? `&after=${encodeURIComponent(after)}` : ""}`;
    const resp = await discordFetch(`/users/@me/guilds?${query}`, accessToken);
    // Fail closed: a partial guild list would let a blacklisted server on a
    // later page slip past the check.
    if (!resp.ok) return null;
    const chunk = await resp.json();
    if (!Array.isArray(chunk)) return null;
    guilds.push(...chunk);
    if (chunk.length < 200) break;
    after = chunk[chunk.length - 1]?.id;
    if (!after) break;
  }
  return guilds;
}

export async function fetchMemberRoles(accessToken, guildId) {
  try {
    await waitForMemberToken();
    const resp = await discordFetch(`/users/@me/guilds/${guildId}/member`, accessToken);
    if (!resp.ok) return null;
    const member = await resp.json();
    return Array.isArray(member.roles) ? member.roles : [];
  } catch {
    return null;
  }
}
