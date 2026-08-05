import { base64UrlDecode, base64UrlEncode, constantTimeEqual, hmacSha256 } from "./crypto.js";

const DEFAULT_COOKIE_NAME = "nai_gallery_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

function cookieName(env) {
  return env.COOKIE_NAME || DEFAULT_COOKIE_NAME;
}

function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

export async function createSessionCookie(env, discordId) {
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(JSON.stringify({ discord_id: discordId, exp: now + SESSION_TTL_SECONDS }));
  const signature = base64UrlEncode(await hmacSha256(env.SESSION_SECRET, payload));
  return `${cookieName(env)}=${payload}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie(env) {
  return `${cookieName(env)}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function decodePathParam(value) {
  const raw = String(value || "");
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export async function getSession(request, env) {
  const raw = parseCookies(request)[cookieName(env)];
  if (!raw || !raw.includes(".")) return null;
  const [payload, signature] = raw.split(".");
  const expected = base64UrlEncode(await hmacSha256(env.SESSION_SECRET, payload));
  if (!constantTimeEqual(base64UrlDecode(signature), base64UrlDecode(expected))) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    if (!data.discord_id || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function requireSession(request, env) {
  const session = await getSession(request, env);
  if (!session) {
    return { response: json({ error: "login_required" }, 401) };
  }
  return { session };
}

export async function requireAdmin(request, env) {
  const auth = await requireSession(request, env);
  if (auth.response) return auth;
  const row = await env.DB.prepare("SELECT role FROM users WHERE discord_id = ?").bind(auth.session.discord_id).first();
  if (row?.role !== "admin") return { response: json({ error: "admin_required" }, 403) };
  return auth;
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}
