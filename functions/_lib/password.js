import { base64UrlDecode, base64UrlEncode, bytesToHex } from "./crypto.js";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function randomToken(bytes = 18) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return btoa(String.fromCharCode(...data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function hashPassword(password) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  // Cloudflare Workers Web Crypto supports up to 100,000 PBKDF2 iterations.
  const iterations = 100000;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  );
  return `pbkdf2-sha256$${iterations}$${bytesToHex(salt)}$${bytesToHex(new Uint8Array(derived))}`;
}

async function passwordEncryptionKey(secret) {
  const keyBytes = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(`batch-password:${secret}`),
  );
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptPassword(password, secret) {
  if (!secret) throw new Error("SESSION_SECRET is required to store batch passwords");
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const key = await passwordEncryptionKey(secret);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(password),
  );
  return `v1.${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(encrypted))}`;
}

export async function decryptPassword(value, secret) {
  const [version, ivEncoded, encryptedEncoded] = String(value || "").split(".");
  if (version !== "v1" || !ivEncoded || !encryptedEncoded || !secret) return null;
  try {
    const key = await passwordEncryptionKey(secret);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlDecode(ivEncoded) },
      key,
      base64UrlDecode(encryptedEncoded),
    );
    return textDecoder.decode(decrypted);
  } catch {
    return null;
  }
}

export function slugify(value) {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || `batch-${Date.now()}`;
}
