export async function getUser(env, discordId) {
  return env.DB.prepare("SELECT discord_id, username, avatar, role, created_at, updated_at FROM users WHERE discord_id = ?")
    .bind(discordId)
    .first();
}

export async function upsertUser(env, user) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (discord_id, username, avatar, role, created_at, updated_at)
     VALUES (?, ?, ?, 'user', ?, ?)
     ON CONFLICT(discord_id) DO UPDATE SET username = excluded.username, avatar = excluded.avatar, updated_at = excluded.updated_at`,
  )
    .bind(user.id, user.username, user.avatar || null, now, now)
    .run();
}

export async function isAdmin(env, discordId) {
  const user = await getUser(env, discordId);
  return user?.role === "admin";
}

export async function isBlacklisted(env, discordId) {
  const row = await env.DB.prepare("SELECT 1 AS blocked FROM blacklist WHERE discord_id = ? LIMIT 1")
    .bind(discordId)
    .first();
  return Boolean(row);
}

export async function hasUnlock(env, discordId, batchId) {
  const row = await env.DB.prepare(
    "SELECT 1 AS ok FROM user_batch_unlocks WHERE discord_id = ? AND batch_id = ? LIMIT 1",
  )
    .bind(discordId, batchId)
    .first();
  return Boolean(row);
}

export async function logAction(env, fields) {
  await env.DB.prepare(
    `INSERT INTO access_logs (discord_id, batch_id, image_id, action, timestamp, ip_hash, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      fields.discord_id,
      fields.batch_id || null,
      fields.image_id || null,
      fields.action,
      new Date().toISOString(),
      fields.ip_hash || null,
      fields.user_agent || null,
    )
    .run();
}
