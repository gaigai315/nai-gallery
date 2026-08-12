import { json, requireAdmin } from "../../_lib/session.js";
import { readJson } from "../../_lib/request.js";
import {
  GUILD_WHITELIST_KEY,
  GUILD_BLACKLIST_KEY,
  readGuildList,
  writeGuildList,
  extractInviteCode,
  isDiscordSnowflake,
} from "../../_lib/guild-access.js";

function normalizeGuildList(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const result = [];
  for (const item of input) {
    const guildId = String(item?.guild_id || "").trim();
    if (!/^\d{17,20}$/.test(guildId)) continue;
    const rawRoleId = String(item?.role_id || "").trim();
    const roleId = /^\d{17,20}$/.test(rawRoleId) ? rawRoleId : "";
    const key = roleId ? `${guildId}:${roleId}` : guildId;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      guild_id: guildId,
      guild_name: String(item?.guild_name || "").trim().slice(0, 120),
      role_id: roleId || null,
      role_name: roleId ? String(item?.role_name || "").trim().slice(0, 120) : "",
      member_count: Number(item?.member_count || 0) || null,
      added_at: item?.added_at || new Date().toISOString(),
    });
  }
  return result;
}

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const whitelist = await readGuildList(env, GUILD_WHITELIST_KEY);
  const blacklist = await readGuildList(env, GUILD_BLACKLIST_KEY);
  return json({ whitelist, blacklist });
}

export async function onRequestPut({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  const whitelist = normalizeGuildList(body?.whitelist);
  const blacklist = normalizeGuildList(body?.blacklist);

  await writeGuildList(env, GUILD_WHITELIST_KEY, whitelist);
  await writeGuildList(env, GUILD_BLACKLIST_KEY, blacklist);

  return json({ ok: true, whitelist, blacklist });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  const raw = String(body?.invite || body?.code || body?.url || body?.guild_id || "").trim();
  if (!raw) return json({ error: "missing_invite" }, 400);

  // Direct guild ID input (a 17-20 digit Discord snowflake).
  if (isDiscordSnowflake(raw)) {
    let guildName = String(body?.guild_name || "").trim().slice(0, 120);
    if (!guildName) {
      try {
        const widgetResp = await fetch(`https://discord.com/api/guilds/${raw}/widget.json`);
        if (widgetResp.ok) {
          const widget = await widgetResp.json();
          guildName = String(widget?.name || "").trim().slice(0, 120);
        }
      } catch {
        // Widget is optional; keep the name blank if it is disabled or unreachable.
      }
    }
    return json({
      guild_id: raw,
      guild_name: guildName,
      member_count: null,
    });
  }

  const code = extractInviteCode(raw);
  if (!code) return json({ error: "invalid_invite" }, 400);

  const resp = await fetch(
    `https://discord.com/api/v9/invites/${encodeURIComponent(code)}?with_counts=true`,
  );
  if (!resp.ok) return json({ error: "invalid_invite" }, 400);

  const data = await resp.json();
  const guild = data?.guild;
  if (!guild?.id) return json({ error: "invalid_invite" }, 400);

  return json({
    guild_id: guild.id,
    guild_name: guild.name || "",
    member_count: data.approximate_member_count ?? guild.approximate_member_count ?? null,
  });
}
