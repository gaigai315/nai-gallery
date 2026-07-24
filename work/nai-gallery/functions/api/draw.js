import { hasUnlock } from "../_lib/db.js";
import { createR2SignedGetUrl } from "../_lib/r2-sign.js";
import { json, requireSession } from "../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;

  const unlocks = await env.DB.prepare(
    "SELECT batch_id FROM user_batch_unlocks WHERE discord_id = ?",
  )
    .bind(auth.session.discord_id)
    .all();

  const batchIds = (unlocks.results || []).map((r) => r.batch_id);
  if (batchIds.length === 0) {
    return json({ error: "no_unlocked_batches" }, 404);
  }

  const placeholders = batchIds.map(() => "?").join(",");
  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM images WHERE batch_id IN (${placeholders}) AND is_active = 1`,
  )
    .bind(...batchIds)
    .first();

  const total = totalRow?.count || 0;
  if (total === 0) return json({ error: "no_unlocked_batches" }, 404);

  const offset = Math.floor(Math.random() * total);
  const image = await env.DB.prepare(
    `SELECT i.image_id, i.batch_id, i.prompt_preview, i.seed, i.steps, i.cfg_scale,
            i.sampler, i.noise_schedule, i.width, i.height, i.r2_key, i.preview_r2_key,
            i.metadata, b.batch_name
     FROM images i
     JOIN batches b ON b.batch_id = i.batch_id
     WHERE i.batch_id IN (${placeholders}) AND i.is_active = 1
     LIMIT 1 OFFSET ?`,
  )
    .bind(...batchIds, offset)
    .first();

  if (!image) return json({ error: "no_unlocked_batches" }, 404);

  const previewUrl = image.preview_r2_key
    ? await createR2SignedGetUrl(env, image.preview_r2_key, 300)
    : null;
  const imageUrl = image.r2_key
    ? await createR2SignedGetUrl(env, image.r2_key, 300)
    : null;

  let positivePrompt = "";
  let negativePrompt = "";
  try {
    if (image.metadata) {
      const meta = JSON.parse(image.metadata);
      positivePrompt = meta.positive_prompt || "";
      negativePrompt = meta.negative_prompt || "";
    }
  } catch { /* ignore parse errors */ }

  return json({
    image_id: image.image_id,
    batch_id: image.batch_id,
    batch_name: image.batch_name,
    preview_url: previewUrl,
    image_url: imageUrl,
    prompt_preview: image.prompt_preview,
    positive_prompt: positivePrompt,
    negative_prompt: negativePrompt,
    seed: image.seed,
    steps: image.steps,
    cfg_scale: image.cfg_scale,
    sampler: image.sampler,
    width: image.width,
    height: image.height,
  });
}
