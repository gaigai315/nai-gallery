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
