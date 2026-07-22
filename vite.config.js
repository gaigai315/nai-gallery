import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Dev-mode API middleware: intercepts /api/* and returns valid JSON
// so the SPA fallback doesn't serve index.html as the response body.
function devApiPlugin() {
  return {
    name: "dev-api",
    configureServer(server) {
      server.middlewares.use("/api", (req, res, next) => {
        // Prevent SPA fallback from serving HTML for API routes
        res.setHeader("Content-Type", "application/json");

        const url = req.url?.split("?")[0];
        const method = req.method?.toUpperCase();

        if (url === "/me" && method === "GET") {
          res.end(JSON.stringify({ user: null }));
          return;
        }

        if (url === "/my-unlocks" && method === "GET") {
          res.end(JSON.stringify({ batches: [] }));
          return;
        }

        if (url === "/logout" && method === "POST") {
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        // Gallery images for a specific batch
        if (url?.startsWith("/gallery/") && method === "GET") {
          const batchId = url.split("/")[2] || "";
          res.end(JSON.stringify({
            batch: { batch_id: batchId, batch_name: "Dev Batch", created_at: new Date().toISOString() },
            images: [],
          }));
          return;
        }

        // Auth endpoints — redirect to landing (won't work, but graceful)
        if (url === "/auth/discord" || url === "/auth/callback") {
          res.statusCode = 302;
          res.setHeader("Location", "/");
          res.end();
          return;
        }

        // All other API endpoints: return clean unavailable response
        res.statusCode = 503;
        res.end(JSON.stringify({ error: "unavailable_in_dev" }));
      });
    },
  };
}

export default defineConfig({
  plugins: [vue(), devApiPlugin()],
});
