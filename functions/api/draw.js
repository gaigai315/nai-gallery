import { createR2SignedGetUrl } from "../_lib/r2-sign.js";
import { json, requireSession } from "../_lib/session.js";
import { isAdmin } from "../_lib/db.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  const discordId = auth.session.discord_id;
  const admin = await isAdmin(env, discordId);

  // Admins can draw from every active batch without creating unlock records.
  const unlocked = admin
    ? await env.DB.prepare("SELECT batch_id FROM batches WHERE is_active = 1").all()
    : await env.DB.prepare(
        "SELECT batch_id FROM user_batch_unlocks WHERE discord_id = ?",
      ).bind(discordId).all();

  if (!unlocked.results || unlocked.results.length === 0) {
    return json({ error: "no_unlocked_batches" }, 404);
  }

  const batchIds = unlocked.results.map((r) => r.batch_id);
  const placeholders = batchIds.map(() => "?").join(",");

  // Count total images across all unlocked batches
  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM images WHERE batch_id IN (${placeholders}) AND is_active = 1`,
  )
    .bind(...batchIds)
    .first();

  const total = countRow?.count || 0;
  if (total === 0) {
    return json({ error: "no_images" }, 404);
  }

  // Random offset
  const offset = Math.floor(Math.random() * total);

  const row = await env.DB.prepare(
    `SELECT i.image_id, i.batch_id, i.prompt_preview, i.seed, i.width, i.height,
            i.r2_key, i.preview_r2_key, i.metadata_json,
            b.batch_name
     FROM images i
     JOIN batches b ON i.batch_id = b.batch_id
     WHERE i.batch_id IN (${placeholders}) AND i.is_active = 1
     LIMIT 1 OFFSET ?`,
  )
    .bind(...batchIds, offset)
    .first();

  if (!row) {
    return json({ error: "no_images" }, 404);
  }

  // Parse metadata for positive/negative prompt + params
  let positivePrompt = row.prompt_preview || "";
  let negativePrompt = "";
  let steps = 0;
  let cfgScale = 0;
  let sampler = "";

  if (row.metadata_json) {
    try {
      const meta = JSON.parse(row.metadata_json);
      positivePrompt = meta.positive_prompt || meta.prompt || positivePrompt;
      negativePrompt = meta.negative_prompt || meta.uc || "";
      steps = meta.steps || 0;
      cfgScale = meta.cfg_scale || meta.scale || 0;
      sampler = meta.sampler || "";
    } catch {
      // fall through to defaults
    }
  }

  // Generate signed URLs (5 min TTL)
  const previewUrl = row.preview_r2_key
    ? await createR2SignedGetUrl(env, row.preview_r2_key, 300)
    : null;
  const imageUrl = row.r2_key
    ? await createR2SignedGetUrl(env, row.r2_key, 300)
    : null;

  return json({
    image_id: row.image_id,
    batch_id: row.batch_id,
    batch_name: row.batch_name,
    preview_url: previewUrl,
    image_url: imageUrl,
    prompt_preview: row.prompt_preview || positivePrompt?.slice(0, 80) || "",
    positive_prompt: positivePrompt,
    negative_prompt: negativePrompt,
    seed: row.seed || "",
    steps,
    cfg_scale: cfgScale,
    sampler,
    width: row.width || 0,
    height: row.height || 0,
  });
}
