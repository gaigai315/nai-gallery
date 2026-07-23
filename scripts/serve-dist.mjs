import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "..", "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".svg":  "image/svg+xml",
  ".json": "application/json",
  ".ico":  "image/x-icon",
  ".woff2":"font/woff2",
};

const mockBatches = [
  { batch_id:"dev-batch-001", batch_name:"Dev Batch Alpha", created_at:new Date().toISOString(), expire_at:null, is_active:1, image_count:12, group_count:3 },
  { batch_id:"dev-batch-002", batch_name:"Dev Batch Beta",  created_at:new Date(Date.now()-86400000).toISOString(), expire_at:null, is_active:0, image_count:4, group_count:1 },
];

function json(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
  });
}

function serveStatic(req, res, pathname) {
  const safe = pathname.replace(/\.\./g, "");
  const filePath = join(DIST, safe === "/" ? "index.html" : safe);
  if (!existsSync(filePath)) return false;
  const ext = extname(filePath).toLowerCase();
  readFile(filePath)
    .then((buf) => {
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(buf);
    })
    .catch(() => { res.writeHead(500); res.end(); });
  return true;
}

async function handleApi(req, res, url, method) {
  const pathname = url.split("?")[0];
  if (pathname === "/api/me" && method === "GET") return json(res, { user: null });
  if (pathname === "/api/my-unlocks" && method === "GET") return json(res, { batches: [] });
  if (pathname === "/api/logout" && method === "POST") return json(res, { ok: true });
  if (pathname.startsWith("/api/gallery/") && method === "GET") {
    const batchId = pathname.split("/")[3] || "";
    return json(res, { batch: { batch_id:batchId, batch_name:"Dev Batch", created_at:new Date().toISOString() }, images: [] });
  }
  if (pathname === "/api/auth/discord" || pathname === "/api/auth/callback") {
    res.writeHead(302, { Location: "/" });
    return res.end();
  }
  if (pathname === "/api/admin/batches" && method === "GET") return json(res, { batches: mockBatches });
  if (pathname === "/api/admin/batches" && method === "POST") {
    const body = await readBody(req);
    const name = String(body.batch_name || "Untitled").trim();
    const id = "dev-" + Date.now();
    const pwd = "devpass-" + Math.random().toString(36).slice(2,10);
    mockBatches.unshift({ batch_id:id, batch_name:name, created_at:new Date().toISOString(), expire_at:body.expire_at||null, is_active:0, image_count:0, group_count:0 });
    return json(res, { batch_id:id, batch_name:name, password:pwd });
  }
  if (pathname.startsWith("/api/admin/batches/") && method === "PATCH") {
    const batchId = decodeURIComponent(pathname.split("/")[4] || "");
    const body = await readBody(req);
    const b = mockBatches.find((x) => x.batch_id === batchId);
    if (!b) return json(res, { error:"not_found" }, 404);
    if (body.is_active !== undefined) b.is_active = body.is_active ? 1 : 0;
    if (body.expire_at !== undefined) b.expire_at = body.expire_at || null;
    return json(res, { ok:true });
  }
  if (pathname === "/api/admin/uploads/sign" && method === "POST") {
    const body = await readBody(req);
    const files = Array.isArray(body.files) ? body.files : [];
    const uploads = files.map((f) => {
      const folder = f.kind === "txt" ? "txt" : f.kind === "preview" ? "preview" : "original";
      const ext = f.kind === "preview" ? "webp" : f.kind === "txt" ? "txt" : "png";
      const key = "batches/" + body.batch_id + "/" + folder + "/" + f.image_id + "." + ext;
      return { image_id:f.image_id, kind:f.kind, key, url:"https://dev-r2-placeholder.local/"+key, content_type:f.content_type };
    });
    return json(res, { uploads });
  }
  if (pathname === "/api/admin/uploads/complete" && method === "POST") {
    const body = await readBody(req);
    return json(res, { ok:true, image_count:(body.images||[]).length, group_count:(body.groups||[]).length });
  }
  json(res, { error:"unavailable_in_dev" }, 503);
}

const server = createServer(async (req, res) => {
  const url = req.url || "/";
  const method = req.method?.toUpperCase() || "GET";
  if (url.startsWith("/api/")) return handleApi(req, res, url, method);
  if (serveStatic(req, res, url)) return;
  serveStatic(req, res, "/index.html");
});

const PORT = parseInt(process.env.PORT || "5187", 10);
server.listen(PORT, () => {
  console.log("NAI Gallery dev server: http://localhost:" + PORT);
});