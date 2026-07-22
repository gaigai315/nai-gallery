import { sha256Hex } from "./crypto.js";

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function requestAuditFields(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const ipHash = ip && env.IP_HASH_SECRET ? await sha256Hex(`${env.IP_HASH_SECRET}:${ip}`) : null;
  return {
    ip_hash: ipHash,
    user_agent: (request.headers.get("User-Agent") || "").slice(0, 512),
  };
}
