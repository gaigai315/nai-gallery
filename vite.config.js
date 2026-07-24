import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Dev-mode API middleware: intercepts /api/* and returns valid JSON so the SPA
// fallback never serves index.html as the response body. Admin routes are
// mocked in-memory so the AdminView is fully clickable under plain `npm run dev`.

// In-memory dev mock store (lives only for the dev server process).
const mockBatches = [
  { batch_id: "dev-batch-001", batch_name: "Dev Batch Alpha", created_at: new Date().toISOString(), expire_at: null, is_active: 1, image_count: 12, group_count: 3, unlock_count: 2, download_count: 5, notes: "\u590f\u5b63\u5408\u96c6\uff0c\u4e3b\u9898\u4e3a\u82b1\u56ed\u4e0e\u98ce\u666f", cover_image_id: null },
  { batch_id: "dev-batch-002", batch_name: "Dev Batch Beta", created_at: new Date(Date.now() - 86400000).toISOString(), expire_at: null, is_active: 0, image_count: 4, group_count: 1, unlock_count: 0, download_count: 0, notes: "", cover_image_id: null },
];

const coverSvg = (label) => "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="260" height="380" viewBox="0 0 260 380"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3a3a2a"/><stop offset="100%" stop-color="#2a2a1a"/></linearGradient></defs><rect width="260" height="380" fill="url(#g)" rx="12"/><rect x="8" y="8" width="244" height="364" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1" rx="8"/><text x="130" y="180" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-family="sans-serif" font-size="16" letter-spacing="2">' + label + '</text><text x="130" y="210" text-anchor="middle" fill="rgba(255,255,255,0.2)" font-family="sans-serif" font-size="10" letter-spacing="3">THE GLASSHOUSE</text></svg>');

const mockImages = [
  { image_id: "img-001", batch_id: "dev-batch-001", group_id: "grp-001", prompt_preview: "masterpiece, 1girl, garden", seed: 12345678, width: 832, height: 1216, created_at: new Date().toISOString() },
  { image_id: "img-002", batch_id: "dev-batch-001", group_id: "grp-001", prompt_preview: "masterpiece, 1girl, garden, smile", seed: 23456789, width: 832, height: 1216, created_at: new Date().toISOString() },
  { image_id: "img-003", batch_id: "dev-batch-001", group_id: "grp-001", prompt_preview: "masterpiece, 1girl, garden, wind", seed: 34567890, width: 1216, height: 832, created_at: new Date().toISOString() },
  { image_id: "img-004", batch_id: "dev-batch-001", group_id: "grp-002", prompt_preview: "masterpiece, scenery, sunset", seed: 45678901, width: 832, height: 1216, created_at: new Date().toISOString() },
  { image_id: "img-005", batch_id: "dev-batch-001", group_id: "grp-002", prompt_preview: "masterpiece, scenery, night sky", seed: 56789012, width: 1216, height: 832, created_at: new Date().toISOString() },
  { image_id: "img-006", batch_id: "dev-batch-001", group_id: "grp-003", prompt_preview: "masterpiece, abstract, glass", seed: 67890123, width: 832, height: 1216, created_at: new Date().toISOString() },
];

const mockGroups = [
  { group_id: "grp-001", batch_id: "dev-batch-001", title: "Garden Girl", notes: "seed 12345678 \u7684\u53d8\u4f53", positive_prompt: "masterpiece, best quality, 1girl, garden, flowers", negative_prompt: "lowres, bad anatomy", params: "Steps: 28, Sampler: Euler a, CFG scale: 7" },
  { group_id: "grp-002", batch_id: "dev-batch-001", title: "Scenery", notes: "", positive_prompt: "masterpiece, best quality, scenery, landscape", negative_prompt: "lowres, bad anatomy", params: "Steps: 28, Sampler: Euler a, CFG scale: 7" },
  { group_id: "grp-003", batch_id: "dev-batch-001", title: "Abstract", notes: "\u5e9f\u7a3f\uff0c\u4e0d\u5efa\u8bae\u516c\u5f00", positive_prompt: "masterpiece, best quality, abstract, glass texture", negative_prompt: "lowres, bad anatomy", params: "Steps: 28, Sampler: Euler a, CFG scale: 7" },
];


const mockVibePosts = [
  { id: 1, title: 'Summer Vibe Collection', content: 'A set of summer-themed vibe transfer styles. Perfect for bright, warm illustrations.', images_json: JSON.stringify(['vibe_key_1', 'vibe_key_2']), files_json: JSON.stringify([{r2_key: 'file_key_1', file_name: 'summer_vibe_01.vibe', file_size: 2450000}, {r2_key: 'file_key_2', file_name: 'summer_vibe_02.vibe', file_size: 1820000}]), is_active: 1, created_at: new Date().toISOString() },
  { id: 2, title: 'Gothic Dark Styles', content: 'Dark and moody vibe transfer presets for atmospheric scenes.', images_json: JSON.stringify(['vibe_key_3']), files_json: JSON.stringify([{r2_key: 'file_key_3', file_name: 'gothic_dark.vibe', file_size: 3100000}]), is_active: 1, created_at: new Date(Date.now() - 86400000).toISOString() },
];

const mockPromptPosts = [
  { id: 1, title: '1girl garden masterpiece', content: 'masterpiece, best quality, 1girl, garden, flowers, sunlight, dappled light, soft focus', params_json: JSON.stringify({sampler: 'Euler a', steps: '28', cfg_scale: '7', seed: '12345678'}), images_json: JSON.stringify(['prompt_key_1', 'prompt_key_2']), is_active: 1, created_at: new Date().toISOString() },
  { id: 2, title: 'Scenery landscape test', content: 'masterpiece, best quality, scenery, landscape, mountains, lake, reflection, dramatic sky', params_json: JSON.stringify({sampler: 'DPM++ 2M Karras', steps: '30', cfg_scale: '12', seed: '87654321'}), images_json: JSON.stringify(['prompt_key_3']), is_active: 1, created_at: new Date(Date.now() - 172800000).toISOString() },
];
const mockAnnouncements = [
  { id: 1, title: "Welcome to The Glasshouse", content: "A private AI gallery. Respect creators. No redistribution or commercial use.", image_url: null, is_active: 1, sort_order: 0, created_at: new Date().toISOString() },
  { id: 2, title: "Changelog", content: "2026-07-23: Added search, announcements, pledge system.", image_url: null, is_active: 1, sort_order: 1, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 3, title: "Draft", content: "Inactive announcement.", image_url: null, is_active: 0, sort_order: 2, created_at: new Date().toISOString() },
];
let mockSiteConfig = { pledge_text: "No redistribution.\nNo commercial use.\nNo AI training with these images." };

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
  });
}

function devApiPlugin() {
  return {
    name: "dev-api",
    configureServer(server) {
      server.middlewares.use("/api", async (req, res) => {
        res.setHeader("Content-Type", "application/json");
        const url = req.url?.split("?")[0];
        const method = req.method?.toUpperCase();

        // ---- public ----
        if (url === "/me" && method === "GET") { res.end(JSON.stringify({ user: null })); return; }
        if (url === "/my-unlocks" && method === "GET") { const unlocked = mockBatches.map((b) => ({ batch_id: b.batch_id, batch_name: b.batch_name, cover_url: coverSvg(b.batch_name), created_at: b.created_at, image_count: b.image_count, group_count: b.group_count, notes: b.notes || "" })); res.end(JSON.stringify({ batches: unlocked })); return; }
        if (url === "/my-favorites" && method === "GET") { res.end(JSON.stringify({ favorites: [{ image_id: "img-001", batch_id: "dev-batch-001", batch_name: "Dev Batch Alpha", prompt_preview: "masterpiece, 1girl, garden", preview_url: coverSvg("FAV 01"), favorited_at: new Date().toISOString() }, { image_id: "img-004", batch_id: "dev-batch-001", batch_name: "Dev Batch Alpha", prompt_preview: "masterpiece, scenery, sunset", preview_url: coverSvg("FAV 02"), favorited_at: new Date(Date.now() - 3600000).toISOString() }] })); return; }
        if (url === "/logout" && method === "POST") { res.end(JSON.stringify({ ok: true })); return; }
        // ---- draw (random image from unlocked batches) ----
        if (url === "/draw" && method === "GET") {
          const img = mockImages[Math.floor(Math.random() * mockImages.length)];
          const batch = mockBatches.find(function(b) { return b.batch_id === img.batch_id; });
          res.end(JSON.stringify({
            image_id: img.image_id, batch_id: img.batch_id,
            batch_name: batch ? batch.batch_name : "Dev Batch",
            preview_url: coverSvg("DRAW"), image_url: coverSvg("DRAW-FULL"),
            prompt_preview: img.prompt_preview,
            positive_prompt: "masterpiece, best quality, 1girl, garden",
            negative_prompt: "lowres, bad anatomy",
            seed: img.seed, steps: 28, cfg_scale: 7, sampler: "Euler a",
            width: img.width, height: img.height,
          }));
          return;
        }


        if (url?.startsWith("/gallery/") && method === "GET") {
          const batchId = url.split("/")[2] || "";
          res.end(JSON.stringify({
            batch: { batch_id: batchId, batch_name: batchId === "dev-batch-001" ? "Dev Batch Alpha" : batchId === "dev-batch-002" ? "Dev Batch Beta" : "Dev Batch", created_at: new Date().toISOString(), notes: batchId === "dev-batch-001" ? "\u590f\u5b63\u5408\u96c6\uff0c\u4e3b\u9898\u4e3a\u82b1\u56ed\u4e0e\u98ce\u666f" : "" },
            images: batchId === "dev-batch-001" ? mockImages : [],
            groups: batchId === "dev-batch-001" ? mockGroups : [],
          }));
          return;
        }

        if (url === "/auth/discord" || url === "/auth/callback") {
          res.statusCode = 302;
          res.setHeader("Location", "/");
          res.end();
          return;
        }

        // Mock image preview - returns placeholder SVG
        if (url?.startsWith("/preview/") && method === "GET") {
          const imgId = url.split("/")[2] || "";
          const w = 400, h = 600;
          const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4a4a3a"/><stop offset="100%" stop-color="#3a3a2a"/></linearGradient></defs><rect width="' + w + '" height="' + h + '" fill="url(#g)"/><text x="' + (w/2) + '" y="' + (h/2) + '" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="sans-serif" font-size="12">' + imgId + '</text></svg>';
          res.setHeader("Content-Type", "image/svg+xml");
          res.end(svg);
          return;
        }

        // ---- admin mocks ----

        if (url?.match(/^\/admin\/batches\/[^/]+\/activity$/) && method === "GET") {
          const bid = url.split("/")[3];
          res.end(JSON.stringify({
            batch_id: bid,
            unlocks: [{ discord_id: "u1", username: "Alice", unlocked_at: new Date().toISOString() }],
            downloads: [{ discord_id: "u1", username: "Alice", image_id: "img1", asset: "image", timestamp: new Date().toISOString() }],
          }));
          return;
        }

        if (url === "/admin/batches" && method === "GET") {
          res.end(JSON.stringify({ batches: mockBatches }));
          return;
        }

        if (url === "/admin/batches" && method === "POST") {
          const body = await readBody(req);
          const name = String(body.batch_name || "Untitled").trim();
          const id = `dev-${Date.now()}`;
          const password = `devpass-${Math.random().toString(36).slice(2, 10)}`;
          mockBatches.unshift({ batch_id: id, batch_name: name, created_at: new Date().toISOString(), expire_at: body.expire_at || null, is_active: 0, image_count: 0, group_count: 0, unlock_count: 0, download_count: 0 });
          res.end(JSON.stringify({ batch_id: id, batch_name: name, password }));
          return;
        }

        if (url?.startsWith("/admin/batches/") && method === "PATCH") {
          const batchId = decodeURIComponent(url.split("/")[3] || "");
          const body = await readBody(req);
          const b = mockBatches.find((x) => x.batch_id === batchId);
          if (!b) { res.statusCode = 404; res.end(JSON.stringify({ error: "not_found" })); return; }
          if (body.is_active !== undefined) b.is_active = body.is_active ? 1 : 0;
          if (body.expire_at !== undefined) b.expire_at = body.expire_at || null;
          if (body.cover_image_id !== undefined) b.cover_image_id = body.cover_image_id || null;
          if (body.notes !== undefined) b.notes = body.notes || null;
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        if (url?.match(/^\/admin\/batches\/[^/]+\/images$/) && method === "GET") {
          const batchId = decodeURIComponent(url.split("/")[3] || "");
          const filtered = batchId === "dev-batch-001" ? mockImages : [];
          res.end(JSON.stringify({ images: filtered, total: filtered.length }));
          return;
        }

        if (url?.startsWith("/admin/batches/") && method === "DELETE") {
          const batchId = decodeURIComponent(url.split("/")[3] || "");
          const idx = mockBatches.findIndex((x) => x.batch_id === batchId);
          if (idx === -1) { res.statusCode = 404; res.end(JSON.stringify({ error: "not_found" })); return; }
          mockBatches.splice(idx, 1);
          res.end(JSON.stringify({ ok: true, deleted_images: 0 }));
          return;
        }

        if (url?.startsWith("/admin/images/") && method === "PATCH") {
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        if (url?.startsWith("/admin/images/") && method === "DELETE") {
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        if (url === "/admin/uploads/sign" && method === "POST") {
          const body = await readBody(req);
          const files = Array.isArray(body.files) ? body.files : [];
          const uploads = files.map((f) => {
            const folder = f.kind === "txt" ? "txt" : f.kind === "preview" ? "preview" : "original";
            const ext = f.kind === "preview" ? "webp" : f.kind === "txt" ? "txt" : "png";
            const key = `batches/${body.batch_id}/${folder}/${f.image_id}.${ext}`;
            return { image_id: f.image_id, kind: f.kind, key, url: `https://dev-r2-placeholder.local/${key}`, content_type: f.content_type };
          });
          res.end(JSON.stringify({ uploads }));
          return;
        }

        if (url === "/admin/uploads/complete" && method === "POST") {
          const body = await readBody(req);
          res.end(JSON.stringify({ ok: true, image_count: (body.images || []).length, group_count: (body.groups || []).length }));
          return;
        }

        if (url === "/admin/groups" && method === "GET") {
          res.end(JSON.stringify({ groups: mockGroups }));
          return;
        }

        if (url === "/admin/stats" && method === "GET") { res.end(JSON.stringify({ total_users: 3, total_unlocks: 5, total_downloads: 8 })); return; }

        if (url === "/search" && method === "GET") {
          const qs = new URLSearchParams(req.url?.split("?")[1] || "");
          const q = (qs.get("q") || "").toLowerCase().trim();
          const type = qs.get("type") || "prompt";
          if (type === "batch") {
            const matched = mockBatches.filter((b) => b.batch_name.toLowerCase().includes(q));
            const results = matched.map((b) => ({
              batch_id: b.batch_id, batch_name: b.batch_name,
              cover_url: coverSvg(b.batch_name), type: "batch",
            }));
            res.end(JSON.stringify({ results }));
          } else {
            const matched = mockImages.filter((img) => img.prompt_preview.toLowerCase().includes(q));
            const results = matched.map((img) => ({
              image_id: img.image_id, batch_id: img.batch_id,
              prompt_preview: img.prompt_preview,
              batch_name: mockBatches.find((b) => b.batch_id === img.batch_id)?.batch_name || "",
              preview_url: coverSvg("SRCH"), type: "prompt",
            }));
            res.end(JSON.stringify({ results }));
          }
          return;
        }

        // ---- announcements (public) ----
        if (url === "/announcements" && method === "GET") {
          res.end(JSON.stringify({ announcements: mockAnnouncements.filter((a) => a.is_active).sort((a, b) => a.sort_order - b.sort_order) }));
          return;
        }

        // ---- admin announcements ----
        if (url === "/admin/announcements" && method === "GET") {
          res.end(JSON.stringify({ announcements: mockAnnouncements }));
          return;
        }
        if (url === "/admin/announcements" && method === "POST") {
          const body = await readBody(req);
          const id = Date.now();
          const so = Math.max(...mockAnnouncements.map((a) => a.sort_order), -1) + 1;
          mockAnnouncements.push({ id, title: body.title || "", content: body.content || "", image_url: body.image_url || null, is_active: 1, sort_order: so, created_at: new Date().toISOString() });
          res.end(JSON.stringify({ ok: true, id }));
          return;
        }
        if (url?.match(/^\/admin\/announcements\/\d+$/) && method === "PATCH") {
          const id = Number(url.split("/")[3]);
          const body = await readBody(req);
          const a = mockAnnouncements.find((x) => x.id === id);
          if (!a) { res.statusCode = 404; res.end(JSON.stringify({ error: "not_found" })); return; }
          ["title","content","image_url","is_active","sort_order"].forEach((k) => { if (body[k] !== undefined) a[k] = body[k]; });
          res.end(JSON.stringify({ ok: true }));
          return;
        }
        if (url?.match(/^\/admin\/announcements\/\d+$/) && method === "DELETE") {
          const id = Number(url.split("/")[3]);
          const idx = mockAnnouncements.findIndex((x) => x.id === id);
          if (idx === -1) { res.statusCode = 404; res.end(JSON.stringify({ error: "not_found" })); return; }
          mockAnnouncements.splice(idx, 1);
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        // ---- site-config ----
        if (url === "/site-config" && method === "GET") {
          res.end(JSON.stringify({ pledge_text: mockSiteConfig.pledge_text }));
          return;
        }
        if (url === "/admin/site-config" && method === "GET") {
          res.end(JSON.stringify({ pledge_text: mockSiteConfig.pledge_text }));
          return;
        }
        if (url === "/admin/site-config" && method === "PUT") {
          const body = await readBody(req);
          if (body.key === "pledge_text") mockSiteConfig.pledge_text = body.value || "";
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        
        // ---- vibe (public) ----
        if (url === '/vibe' && method === 'GET') {
          const posts = mockVibePosts.filter(p => p.is_active).map(p => {
            let imgs = []; try { imgs = JSON.parse(p.images_json || '[]'); } catch {}
            let files = []; try { files = JSON.parse(p.files_json || '[]'); } catch {}
            return { id: p.id, title: p.title, content_preview: (p.content || '').slice(0, 80), image_count: imgs.length, file_count: files.length, first_image: imgs.length > 0 ? '/api/preview/' + imgs[0] : '', created_at: p.created_at };
          });
          res.end(JSON.stringify({ posts }));
          return;
        }
        if (url?.match(/^\/vibe\/\d+$/) && method === 'GET') {
          const id = Number(url.split('/')[2]);
          const p = mockVibePosts.find(x => x.id === id);
          if (!p) { res.statusCode = 404; res.end(JSON.stringify({ error: 'not_found' })); return; }
          let imgs = []; try { imgs = JSON.parse(p.images_json || '[]'); } catch {}
          let files = []; try { files = JSON.parse(p.files_json || '[]'); } catch {}
          res.end(JSON.stringify({ id: p.id, title: p.title, content: p.content || '', images: imgs.map(k => '/api/preview/' + k), files: files.map(f => ({ name: f.file_name, size: f.file_size, url: '/api/download/vibe/' + p.id + '/' + f.r2_key })), created_at: p.created_at }));
          return;
        }

        // ---- vibe admin ----
        if (url === '/admin/vibe' && method === 'GET') {
          res.end(JSON.stringify({ posts: mockVibePosts }));
          return;
        }
        if (url === '/admin/vibe' && method === 'POST') {
          const body = await readBody(req);
          const id = Date.now();
          const post = { id, title: body.title || '', content: body.content || '', images_json: body.images_json || '[]', files_json: body.files_json || '[]', is_active: 1, created_at: new Date().toISOString() };
          mockVibePosts.unshift(post);
          res.end(JSON.stringify({ ok: true, id }));
          return;
        }
        if (url?.match(/^\/admin\/vibe\/\d+$/) && method === 'PATCH') {
          const id = Number(url.split('/')[3]);
          const body = await readBody(req);
          const p = mockVibePosts.find(x => x.id === id);
          if (!p) { res.statusCode = 404; res.end(JSON.stringify({ error: 'not_found' })); return; }
          ['title','content','images_json','files_json','is_active'].forEach(k => { if (body[k] !== undefined) p[k] = body[k]; });
          res.end(JSON.stringify({ ok: true }));
          return;
        }
        if (url?.match(/^\/admin\/vibe\/\d+$/) && method === 'DELETE') {
          const id = Number(url.split('/')[3]);
          const idx = mockVibePosts.findIndex(x => x.id === id);
          if (idx === -1) { res.statusCode = 404; res.end(JSON.stringify({ error: 'not_found' })); return; }
          mockVibePosts.splice(idx, 1);
          res.end(JSON.stringify({ ok: true }));
          return;
        }
        if (url === '/admin/vibe/upload-sign' && method === 'POST') {
          const body = await readBody(req);
          const files = Array.isArray(body.files) ? body.files : [];
          const entries = files.map((f, i) => ({ key: 'vibe/' + Date.now() + '_' + (f.file_name || 'file'), url: 'https://dev-r2-placeholder.local/vibe/' + Date.now() + '_' + (f.file_name || 'file'), file_name: f.file_name, content_type: f.content_type || 'application/octet-stream' }));
          res.end(JSON.stringify({ entries }));
          return;
        }

        // ---- prompts upload-sign ----
        if (url === '/admin/prompts/upload-sign' && method === 'POST') {
          const body = await readBody(req);
          const files = Array.isArray(body.files) ? body.files : [];
          const entries = files.map((f, i) => ({ key: 'prompts/' + Date.now() + '_' + (f.file_name || 'file'), url: 'https://dev-r2-placeholder.local/prompts/' + Date.now() + '_' + (f.file_name || 'file'), file_name: f.file_name, content_type: f.content_type || 'application/octet-stream' }));
          res.end(JSON.stringify({ entries }));
          return;
        }

        // ---- prompts (public) ----
        if (url === '/prompts' && method === 'GET') {
          const posts = mockPromptPosts.filter(p => p.is_active).map(p => {
            let imgs = []; try { imgs = JSON.parse(p.images_json || '[]'); } catch {}
            return { id: p.id, title: p.title, content_preview: (p.content || '').slice(0, 80), image_count: imgs.length, first_image: imgs.length > 0 ? '/api/preview/' + imgs[0] : '', created_at: p.created_at };
          });
          res.end(JSON.stringify({ posts }));
          return;
        }
        if (url?.match(/^\/prompts\/\d+$/) && method === 'GET') {
          const id = Number(url.split('/')[2]);
          const p = mockPromptPosts.find(x => x.id === id);
          if (!p) { res.statusCode = 404; res.end(JSON.stringify({ error: 'not_found' })); return; }
          let imgs = []; try { imgs = JSON.parse(p.images_json || '[]'); } catch {}
          let params = null; try { params = JSON.parse(p.params_json || 'null'); } catch {}
          res.end(JSON.stringify({ id: p.id, title: p.title, content: p.content, params, images: imgs.map(k => '/api/preview/' + k), created_at: p.created_at }));
          return;
        }

        // ---- prompts admin ----
        if (url === '/admin/prompts' && method === 'GET') {
          res.end(JSON.stringify({ posts: mockPromptPosts }));
          return;
        }
        if (url === '/admin/prompts' && method === 'POST') {
          const body = await readBody(req);
          const id = Date.now();
          const post = { id, title: body.title || '', content: body.content || '', params_json: body.params_json || null, images_json: body.images_json || '[]', is_active: 1, created_at: new Date().toISOString() };
          mockPromptPosts.unshift(post);
          res.end(JSON.stringify({ ok: true, id }));
          return;
        }
        if (url?.match(/^\/admin\/prompts\/\d+$/) && method === 'PATCH') {
          const id = Number(url.split('/')[3]);
          const body = await readBody(req);
          const p = mockPromptPosts.find(x => x.id === id);
          if (!p) { res.statusCode = 404; res.end(JSON.stringify({ error: 'not_found' })); return; }
          ['title','content','params_json','images_json','is_active'].forEach(k => { if (body[k] !== undefined) p[k] = body[k]; });
          res.end(JSON.stringify({ ok: true }));
          return;
        }
        if (url?.match(/^\/admin\/prompts\/\d+$/) && method === 'DELETE') {
          const id = Number(url.split('/')[3]);
          const idx = mockPromptPosts.findIndex(x => x.id === id);
          if (idx === -1) { res.statusCode = 404; res.end(JSON.stringify({ error: 'not_found' })); return; }
          mockPromptPosts.splice(idx, 1);
          res.end(JSON.stringify({ ok: true }));
          return;
        }

// ---- fallback ----
        res.statusCode = 503;
        res.end(JSON.stringify({ error: "unavailable_in_dev" }));
      });
    },
  };
}

export default defineConfig({
  plugins: [vue(), devApiPlugin()],
});
