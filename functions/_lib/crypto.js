const textEncoder = new TextEncoder();

export function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function base64UrlEncode(value) {
  const bytes = typeof value === "string" ? textEncoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hmacSha256(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, textEncoder.encode(message)));
}

export async function sha256Hex(message) {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(message));
  return bytesToHex(new Uint8Array(digest));
}

export async function verifyPassword(password, encodedHash) {
  const [scheme, iterationsRaw, saltHex, hashHex] = String(encodedHash || "").split("$");
  if (scheme !== "pbkdf2-sha256") return false;
  const iterations = Number(iterationsRaw);
  // Cloudflare Workers rejects PBKDF2 values above 100,000 instead of returning
  // a normal comparison result. Treat legacy hashes as invalid so the API can
  // still return JSON and the administrator can issue a compatible password.
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 100000) return false;
  try {
  const key = await crypto.subtle.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations },
    key,
    hexToBytes(hashHex).length * 8,
  );
  return constantTimeEqual(new Uint8Array(derived), hexToBytes(hashHex));
  } catch {
    return false;
  }
}
