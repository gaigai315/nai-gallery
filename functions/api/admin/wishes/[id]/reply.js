
 import { json, requireAdmin } from "../../../../_lib/session.js";
 import { readJson } from "../../../../_lib/request.js";

 export async function onRequestPost({ request, env, params }) {
   try {
     const auth = await requireAdmin(request, env);
     if (auth.response) return auth.response;

     const wishId = Number(params.id);
     if (!wishId) return json({ error: "invalid_id" }, 400);

     const wish = await env.DB.prepare("SELECT id FROM wishes WHERE id = ?").bind(wishId).first();
     if (!wish) return json({ error: "not_found" }, 404);

     const body = await readJson(request);
     const content = String(body?.content || "").trim();
     if (!content) return json({ error: "missing_fields" }, 400);

     const discordId = auth.session.discord_id;
     const user = await env.DB.prepare("SELECT username, avatar_url FROM users WHERE discord_id = ?")
       .bind(discordId).first();

     const result = await env.DB.prepare(
       "INSERT INTO wish_replies (wish_id, discord_id, username, avatar_url, content) VALUES (?, ?, ?, ?, ?)"
     ).bind(wishId, discordId, user?.username || "", user?.avatar_url || "", content).run();

     return json({
       ok: true,
       id: result.meta?.last_row_id,
       username: user?.username || "",
       avatar_url: user?.avatar_url || "",
       created_at: new Date().toISOString(),
     }, 201);
   } catch (err) {
     console.error("admin/wishes/[id]/reply POST error:", err);
     return json({ error: "server_error", detail: err.message }, 500);
   }
 }
