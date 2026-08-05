import { isAdmin } from "../_lib/db.js";
import { json, requireSession } from "../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth.response;
  // Admins see all batches including inactive ones
  const isAdminUser = await isAdmin(env, auth.session.discord_id);
  const activeClause = isAdminUser ? "1=1" : "b.is_active = 1";
  const rows = await env.DB.prepare(
    `SELECT b.batch_id, b.batch_name, b.created_at, b.expire_at, u.unlocked_at, u.last_seen_at,
         b.notes, b.cover_image_id, b.is_active,
         (SELECT COUNT(*) FROM images WHERE batch_id = b.batch_id AND is_active = 1) AS image_count,
         (SELECT COUNT(*) FROM prompt_groups WHERE batch_id = b.batch_id) AS group_count
     FROM batches b
     LEFT JOIN user_batch_unlocks u ON u.batch_id = b.batch_id AND u.discord_id = ?
     WHERE ${activeClause}
     ORDER BY b.created_at DESC`,
  )
    .bind(auth.session.discord_id)
    .all();

  const batches = rows.results || [];

  // Attach cover_url for each batch using the first image
  const coverMap = new Map(); // fallback for batches without explicit cover_image_id
  if (batches.length > 0) {
    const batchesNeedingCover = batches.filter((b) => !b.cover_image_id);
    if (batchesNeedingCover.length > 0) {
      const placeholders = batchesNeedingCover.map(() => "?").join(", ");
      const coverRows = await env.DB.prepare(
        `SELECT batch_id, image_id
         FROM images
         WHERE batch_id IN (${placeholders}) AND is_active = 1
         GROUP BY batch_id
         HAVING image_id = MIN(image_id)`
      )
        .bind(...batchesNeedingCover.map((b) => b.batch_id))
       .all();
      for (const row of coverRows.results || []) {
        coverMap.set(
          row.batch_id,
          `/api/cover/${encodeURIComponent(row.image_id)}?batch_id=${encodeURIComponent(row.batch_id)}`
        );
      }
    }
  }

  return json({
    batches: batches.map((b) => ({
      ...b,
      notes: b.notes || "",
      cover_url: b.cover_image_id
        ? `/api/cover/${encodeURIComponent(b.cover_image_id)}?batch_id=${encodeURIComponent(b.batch_id)}`
        : coverMap.get(b.batch_id) || "",
    })),
  });
}
