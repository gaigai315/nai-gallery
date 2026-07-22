import { bytesToHex, hmacSha256, sha256Hex } from "./crypto.js";

async function hmacBytes(keyBytes, message) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

function amzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function dateStamp(date) {
  return amzDate(date).slice(0, 8);
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function createR2SignedGetUrl(env, objectKey, ttlSeconds) {
  return createR2SignedUrl(env, "GET", objectKey, ttlSeconds);
}

export async function createR2SignedPutUrl(env, objectKey, ttlSeconds, contentType = "application/octet-stream") {
  return createR2SignedUrl(env, "PUT", objectKey, ttlSeconds, contentType);
}

async function createR2SignedUrl(env, method, objectKey, ttlSeconds, contentType = "") {
  const now = new Date();
  const service = "s3";
  const region = "auto";
  const host = `${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const bucket = env.R2_BUCKET_NAME;
  const credentialScope = `${dateStamp(now)}/${region}/${service}/aws4_request`;
  const credential = `${env.R2_ACCESS_KEY_ID}/${credentialScope}`;
  const canonicalUri = `/${bucket}/${encodePath(objectKey)}`;
  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate(now),
    "X-Amz-Expires": String(ttlSeconds),
    "X-Amz-SignedHeaders": contentType ? "content-type;host" : "host",
  });
  params.sort();
  const canonicalHeaders = contentType ? `content-type:${contentType}\nhost:${host}\n` : `host:${host}\n`;
  const signedHeaders = contentType ? "content-type;host" : "host";

  const canonicalRequest = [
    method,
    canonicalUri,
    params.toString(),
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate(now),
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const encoder = new TextEncoder();
  const kDate = await hmacBytes(encoder.encode(`AWS4${env.R2_SECRET_ACCESS_KEY}`), dateStamp(now));
  const kRegion = await hmacBytes(kDate, region);
  const kService = await hmacBytes(kRegion, service);
  const kSigning = await hmacBytes(kService, "aws4_request");
  const signature = bytesToHex(await hmacBytes(kSigning, stringToSign));

  return `https://${host}${canonicalUri}?${params.toString()}&X-Amz-Signature=${signature}`;
}
