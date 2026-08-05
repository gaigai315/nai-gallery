/**
 * Upload pipeline helpers for the admin panel.
 * Pure-ish functions: metadata parse -> group -> webp thumbnail -> R2 direct PUT -> manifest.
 * UI layer (AdminView.vue) drives these in sequence and renders progress.
 */

import { parseNaiPng } from "./png-metadata.js";
import { apiFetch } from "./api.js";

/**
 * Simple normalize: remove filter words from a comma-separated prompt.
 * Used for group-key matching so variants like "1girl" vs "1boy"
 * from the same prompt series are treated as the same group.
 * @param {string} prompt
 * @param {string[]} filterWords
 * @returns {string}
 */
function normalizePrompt(prompt, filterWords) {
  if (!prompt || !filterWords || !filterWords.length) return (prompt || "").trim();
  const filterSet = new Set(filterWords.map(w => w.toLowerCase().trim()));
  const parts = prompt.split(/[,，]/).map(p => p.trim());
  const kept = parts.filter(p => !filterSet.has(p.toLowerCase()));
  return kept.join(", ").trim();
}


const MAX_LONG_EDGE = 960;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.75;
const SIGN_FILE_LIMIT = 600;
const PUT_CONCURRENCY = 6;

export function baseName(name) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

/**
 * Build the in-memory upload plan from raw File objects.
 * Pairs PNG <-> TXT by base name, parses NAI metadata, clusters into groups.
 */
export async function buildUploadPlan(files, filterWords = []) {
  const pngs = [];
  const txts = new Map();
  for (const f of files) {
    const lower = f.name.toLowerCase();
    if (lower.endsWith(".png")) pngs.push(f);
    else if (lower.endsWith(".txt")) txts.set(baseName(f.name).toLowerCase(), f);
  }

  const entries = [];
  const groupMap = new Map();

  for (const png of pngs) {
    const base = baseName(png.name);
    const txt = txts.get(base.toLowerCase()) || null;
    const meta = await parseNaiPng(png).catch(() => null);
    const entry = {
      id: crypto.randomUUID(),
      file: png,
      txtFile: txt,
      meta,
      baseName: base,
      blobUrl: URL.createObjectURL(png),
      thumbUrl: null,
      thumbBlob: null,
      width: null,
      height: null,
      groupId: null,
    };
    entries.push(entry);

    if (meta) {
      const rawPos = meta.positive_prompt || "";
      const neg = meta.negative_prompt || "";
      const pos = normalizePrompt(rawPos, filterWords);
      const key = `${pos}\u0000${neg}`;
      let g = groupMap.get(key);
      if (!g) {
        g = { groupKey: key, positive: pos, negative: neg, imageIds: [], id: crypto.randomUUID() };
        groupMap.set(key, g);
      }
      g.imageIds.push(entry.id);
      entry.groupId = g.id;
    } else {
      entry.groupId = "__ungrouped__";
    }
  }

  const groups = [...groupMap.values()].map((g, index) => ({
    id: g.id,
    groupKey: g.groupKey,
    positive_prompt: g.positive,
    negative_prompt: g.negative,
    title: String(index + 1),
    imageIds: g.imageIds,
  }));

  const ungrouped = entries.filter((e) => e.groupId === "__ungrouped__");
  if (ungrouped.length) {
    groups.unshift({
      id: "__ungrouped__",
      groupKey: "__ungrouped__",
      positive_prompt: "",
      negative_prompt: "",
      title: "未分组",
      imageIds: ungrouped.map((e) => e.id),
    });
  }

  return { entries, groups };
}

/** Generate a WebP thumbnail (long edge <= 960); falls back to original preview. */
export async function makeThumbnail(entry) {
  try {
    const bitmap = await createImageBitmap(entry.file);
    entry.width = bitmap.width;
    entry.height = bitmap.height;
    const scale = Math.min(1, MAX_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/webp",
        WEBP_QUALITY,
      );
    });
    entry.thumbBlob = blob;
    entry.thumbUrl = URL.createObjectURL(blob);
    return blob;
  } catch {
    return null;
  }
}

/** Convert a PNG blob to JPEG. Returns { blob, width, height } or null on failure. */
export async function compressToJpeg(blob, quality = JPEG_QUALITY) {
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    const jpegBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", quality);
    });
    return { blob: jpegBlob, width: bitmap.width, height: bitmap.height };
  } catch { return null; }
}

function signFilesFor(entries, format = 'png') {
  const isJpeg = format === 'jpeg';
  const out = [];
  for (const e of entries) {
    out.push({ image_id: e.id, kind: "original", content_type: isJpeg ? "image/jpeg" : "image/png" });
    if (e.thumbBlob) out.push({ image_id: e.id, kind: "preview", content_type: "image/webp" });
    if (e.txtFile) out.push({ image_id: e.id, kind: "txt", content_type: "text/plain" });
  }
  return out;
}

function mapSignResult(uploads) {
  const byId = new Map();
  for (const u of uploads) {
    if (!byId.has(u.image_id)) byId.set(u.image_id, {});
    byId.get(u.image_id)[u.kind] = u;
  }
  return byId;
}

async function putWithRetry(url, blob, contentType, attempts = 2) {
  let lastErr;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": contentType },
        credentials: "omit",
      });
      if (!res.ok) {
        lastErr = new Error("PUT " + res.status);
      } else {
        return res;
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("upload_failed");
}

async function runPool(tasks, onProgress) {
  let completed = 0;
  const queue = [...tasks];
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < queue.length) {
      const myIdx = idx++;
      results[myIdx] = await queue[myIdx]();
      completed++;
      if (onProgress) onProgress(completed, queue.length);
    }
  }
  const workers = Array.from({ length: Math.min(PUT_CONCURRENCY, queue.length) }, worker);
  await Promise.all(workers);
  return results;
}

/**
 * End-to-end: sign + direct-PUT blobs + assemble + submit manifest.
 * @param {string} batchId
 * @param {entries} entries
 * @param {groups} groups
 * @param {(done,total,phase)=>void} onProgress
 * @param {string} format - 'png' | 'jpeg'
 */
export async function uploadBatch(batchId, entries, groups, onProgress, format = 'png') {
  const isJpeg = format === 'jpeg';

  // Convert originals to JPEG when format is 'jpeg'
  if (isJpeg) {
    const compressResults = await Promise.all(entries.map((e) => compressToJpeg(e.file).catch(() => null)));
    for (let i = 0; i < entries.length; i++) {
      if (compressResults[i]) {
        entries[i]._jpegBlob = compressResults[i].blob;
        entries[i].width = entries[i].width || compressResults[i].width;
        entries[i].height = entries[i].height || compressResults[i].height;
      }
    }
  }

  const initialSignFiles = signFilesFor(entries, format);
  if (initialSignFiles.length > SIGN_FILE_LIMIT) {
    throw Object.assign(new Error("too_many_files: " + initialSignFiles.length + " > " + SIGN_FILE_LIMIT), { phase: "limit" });
  }

  await Promise.all(entries.map((e) => makeThumbnail(e).catch(() => null)));

  if (onProgress) onProgress(0, 1, "sign");
  const freshSignFiles = signFilesFor(entries, format);
  let signResp;
  try {
    signResp = await apiFetch("/api/admin/uploads/sign", {
      method: "POST",
      body: JSON.stringify({ batch_id: batchId, files: freshSignFiles }),
    });
  } catch (e) {
    throw Object.assign(new Error("签名失败: " + e.message), { phase: "sign" });
  }

  const byId = mapSignResult(signResp.uploads);

  const origCt = isJpeg ? "image/jpeg" : "image/png";
  const putTasks = [];
  for (const e of entries) {
    const origBlob = isJpeg && e._jpegBlob ? e._jpegBlob : e.file;
    const slot = byId.get(e.id);
    if (!slot) continue;
    if (slot.original) {
      putTasks.push(() => putWithRetry(slot.original.url, origBlob, origCt).then((r) => ({ kind: "original", ok: r.ok, key: slot.original.key, entry: e })));
    }
    if (e.thumbBlob && slot.preview) {
      putTasks.push(() => putWithRetry(slot.preview.url, e.thumbBlob, "image/webp").then((r) => ({ kind: "preview", ok: r.ok, key: slot.preview.key, entry: e })));
    }
    if (e.txtFile && slot.txt) {
      putTasks.push(() => putWithRetry(slot.txt.url, e.txtFile, "text/plain").then((r) => ({ kind: "txt", ok: r.ok, key: slot.txt.key, entry: e })));
    }
  }

  if (onProgress) onProgress(0, putTasks.length, "put");
  const putResults = await runPool(putTasks, (done, total) => {
    if (onProgress) onProgress(done, total, "put");
  });
  const failed = putResults.filter((r) => !r.ok);
  if (failed.length) {
    throw Object.assign(new Error(failed.length + " 个文件上传 R2 失败"), { phase: "put", failed });
  }

  const manifestGroups = groups.map((g) => ({
    group_id: g.id === "__ungrouped__" ? "grp-" + crypto.randomUUID() : g.id,
    title: g.title || "Untitled group",
    positive_prompt: g.positive_prompt || null,
    negative_prompt: g.negative_prompt || null,
    params: g.params || {},
    notes: g.notes || null,
  }));
  const groupIdByOld = new Map(groups.map((g, i) => [g.id, manifestGroups[i].group_id]));

  const manifestImages = entries.map((e) => {
    const slot = byId.get(e.id);
    const gid = e.groupId ? groupIdByOld.get(e.groupId) : null;
    return {
      image_id: e.id,
      group_id: gid,
      r2_key: slot?.original?.key || null,
      preview_r2_key: (e.thumbBlob && slot?.preview?.key) ? slot.preview.key : null,
      txt_key: (e.txtFile && slot?.txt?.key) ? slot.txt.key : null,
      prompt_preview: (e.meta?.positive_prompt || e.baseName).slice(0, 256),
      seed: e.meta?.seed || null,
      metadata: e.meta?.raw || null,
      width: e.width || e.meta?.width || null,
      height: e.height || e.meta?.height || null,
      created_at: new Date().toISOString(),
    };
  }).filter((img) => img.r2_key);

  if (onProgress) onProgress(0, 1, "complete");
  const completeResp = await apiFetch("/api/admin/uploads/complete", {
    method: "POST",
    body: JSON.stringify({
      batch_id: batchId,
      groups: manifestGroups,
      images: manifestImages,
    }),
  });

  for (const e of entries) {
    if (e.blobUrl) URL.revokeObjectURL(e.blobUrl);
    if (e.thumbUrl) URL.revokeObjectURL(e.thumbUrl);
    e.blobUrl = null;
    e.thumbUrl = null;
    e.thumbBlob = null;
  }

  return completeResp;
}

/** Move an entry's groupId to a new group (helper for manual grouping UI). */
export function moveEntryToGroup(entries, entryId, newGroupId) {
  const e = entries.find((x) => x.id === entryId);
  if (e) e.groupId = newGroupId;
}

export { SIGN_FILE_LIMIT };
