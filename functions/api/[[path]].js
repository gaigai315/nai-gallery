import { json } from "../_lib/session.js";

export async function onRequest({ request, env, params }) {
  // Catch-all for unmatched /api/* requests.
  // Returns JSON 404 instead of falling through to the SPA index.html.
  const url = new URL(request.url);
  console.warn("api 404:", url.pathname);
  return json({ error: "not_found", detail: `No API route for ${url.pathname}` }, 404);
}