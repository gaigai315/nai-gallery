import { readJson } from "../../../_lib/request.js";
import { json, requireAdmin } from "../../../_lib/session.js";

function cleanId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "");
}

export async function onRequestPost({ request, env }) {
  try {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  const batchId = String(body?.batch_id || "");
  const groups = Array.isArray(body?.groups) ? body.groups : [];
  const images = Array.isArray(body?.images) ? body.images : [];
  if (!batchId || !images.length) return json({ error: "bad_request" }, 400);

  const batch = await env.DB.prepare("SELECT batch_id FROM batches WHERE batch_id = ?").bind(batchId).first();
  if (!batch) return json({ error: "batch_not_found" }, 404);

  const statements = [];
  const now = new Date().toISOString();
  for (const group of groups) {
    const groupId = cleanId(group.group_id);
    if (!groupId) continue;
    statements.push(
      env.DB.prepare(
`INSERT INTO prompt_groups (group_id, batch_id, title, positive_prompt, negative_prompt, params_json, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(group_id) DO UPDATE SET
           title = excluded.title,
           positive_prompt = excluded.positive_prompt,
           negative_prompt = excluded.negative_prompt,
           params_json = excluded.params_json,
           notes = excluded.notes`,
      ).bind(
        groupId,
        batchId,
        String(group.title || "Untitled group").slice(0, 160),
        group.positive_prompt || null,
        group.negative_prompt || null,
        JSON.stringify(group.params || {}),
        group.notes || null,
        now,
      ),
    );
  }

  for (const image of images) {
    const imageId = cleanId(image.image_id);
    if (!imageId || !image.r2_key) continue;
    statements.push(
      env.DB.prepare(
        `INSERT INTO images (
          image_id, batch_id, group_id, r2_key, preview_r2_key, txt_key, prompt_preview, seed, metadata_json,
          width, height, created_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(image_id) DO UPDATE SET
          batch_id = excluded.batch_id,
          group_id = excluded.group_id,
          r2_key = excluded.r2_key,
          preview_r2_key = excluded.preview_r2_key,
          txt_key = excluded.txt_key,
          prompt_preview = excluded.prompt_preview,
          seed = excluded.seed,
          metadata_json = excluded.metadata_json,
          width = excluded.width,
          height = excluded.height,
          is_active = 1`,
      ).bind(
        imageId,
        batchId,
        cleanId(image.group_id) || null,
        image.r2_key,
        image.preview_r2_key || null,
        image.txt_key || null,
        image.prompt_preview ?? null,
        image.seed || null,
        JSON.stringify(image.metadata || {}),
        Number(image.width) || null,
        Number(image.height) || null,
        image.created_at || now,
      ),
    );
  }

  statements.push(env.DB.prepare("UPDATE batches SET is_active = 1 WHERE batch_id = ?").bind(batchId));
  await env.DB.batch(statements);
  return json({ ok: true, image_count: images.length, group_count: groups.length });
  } catch (error) {
    console.error("complete failed", error);
    return json({ error: "internal_error", detail: String(error.message || "") }, 500);
  }
}
