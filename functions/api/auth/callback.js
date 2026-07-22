import { createSessionCookie } from "../../_lib/session.js";
import { upsertUser } from "../../_lib/db.js";
import { base64UrlEncode, hmacSha256 } from "../../_lib/crypto.js";

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

async function validState(request, env, state) {
  const cookieState = readCookie(request, "nai_oauth_state");
  if (!state || state !== cookieState) return false;
  const [nonce, timestamp, signature] = state.split(".");
  if (!nonce || !timestamp || !signature) return false;
  if (Date.now() - Number(timestamp) > 10 * 60 * 1000) return false;
  const expected = base64UrlEncode(await hmacSha256(env.SESSION_SECRET, `${nonce}.${timestamp}`));
  return signature === expected;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) return Response.redirect(`${env.PUBLIC_BASE_URL || url.origin}/?auth=failed`, 302);
  if (!(await validState(request, env, state))) {
    return Response.redirect(`${env.PUBLIC_BASE_URL || url.origin}/?auth=failed`, 302);
  }

  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI,
    }),
  });
  if (!tokenResponse.ok) return Response.redirect(`${env.PUBLIC_BASE_URL || url.origin}/?auth=failed`, 302);

  const token = await tokenResponse.json();
  const userResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!userResponse.ok) return Response.redirect(`${env.PUBLIC_BASE_URL || url.origin}/?auth=failed`, 302);

  const user = await userResponse.json();
  await upsertUser(env, user);
  const cookie = await createSessionCookie(env, user.id);
  const headers = new Headers({ Location: `${env.PUBLIC_BASE_URL || url.origin}/` });
  headers.append("Set-Cookie", cookie);
  headers.append("Set-Cookie", "nai_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  return new Response(null, {
    status: 302,
    headers,
  });
}
