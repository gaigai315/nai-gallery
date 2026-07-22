import { base64UrlEncode, hmacSha256 } from "../../_lib/crypto.js";

export async function onRequestGet({ env }) {
  const redirectUri = env.DISCORD_REDIRECT_URI;
  const nonce = crypto.randomUUID();
  const timestamp = String(Date.now());
  const signature = base64UrlEncode(await hmacSha256(env.SESSION_SECRET, `${nonce}.${timestamp}`));
  const state = `${nonce}.${timestamp}.${signature}`;
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state,
    prompt: "none",
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://discord.com/oauth2/authorize?${params.toString()}`,
      "Set-Cookie": `nai_oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
