
 import { json, requireSession } from "../../_lib/session.js";
 import { readJson } from "../../_lib/request.js";
 import { createR2SignedPutUrl } from "../../_lib/r2-sign.js";

 export async function onRequestPost({ request, env }) {
   try {
     const auth = await requireSession(request, env);
     if (auth.response) return auth.response;

     const body = await readJson(request);
     const wishId = String(body?.wish_id || "");
     const files = body?.files || [];

     if (!wishId || !files.length) return json({ error: "missing_fields" }, 400);
     if (files.length > 3) return json({ error: "too_many_files" }, 400);

     const entries = [];
     for (let i = 0; i < files.length; i++) {
       const f = files[i];
       const ext = (f.file_name || "").split(".").pop() || "jpg";
       const key = `wishes/${wishId}/${Date.now()}_${i}.${ext}`;
       const url = await createR2SignedPutUrl(env, key, 600, f.content_type || "image/jpeg");
       entries.push({ key, url, file_name: f.file_name, content_type: f.content_type || "image/jpeg" });
     }

     return json({ entries });
   } catch (err) {
     console.error("wishes/upload-sign error:", err);
     return json({ error: "server_error", detail: err.message }, 500);
   }
 }
