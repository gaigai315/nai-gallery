import { reactive } from "vue";
import { unzipSync, strFromU8 } from "fflate";

const DB_NAME = "nai-gallery-local";
const DB_VERSION = 1;
const STORE = "records";
const state = reactive({ gallery: [], prompts: [], vibes: [], ready: false });
let dbPromise;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("无法打开本地存储"));
  });
  return dbPromise;
}

function tx(mode, action) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("本地存储失败"));
  }));
}

function readAll() { return tx("readonly", (store) => store.getAll()); }
function put(record) { return tx("readwrite", (store) => store.put(record)); }
function remove(id) { return tx("readwrite", (store) => store.delete(id)); }

function dataUrlToBlob(dataUrl) {
  if (!String(dataUrl || "").startsWith("data:")) return null;
  const match = String(dataUrl).match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!match) return null;
  const bytes = match[2] ? Uint8Array.from(atob(match[3]), (c) => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(match[3]));
  return new Blob([bytes], { type: match[1] || "application/octet-stream" });
}

function blobUrl(value) {
  if (value instanceof Blob) return URL.createObjectURL(value);
  return value || "";
}

function refresh(records) {
  state.gallery = records.filter((r) => r.type === "gallery");
  state.prompts = records.filter((r) => r.type === "prompt");
  state.vibes = records.filter((r) => r.type === "vibe");
  state.ready = true;
}

export async function initLocalImport() {
  if (state.ready) return state;
  refresh(await readAll());
  return state;
}

export function localState() { return state; }
export function isLocalId(id) { return String(id || "").startsWith("local:"); }
export function openLocalImport() { window.dispatchEvent(new CustomEvent("nai-gallery:open-local-import")); }

function stableId(value) {
  let hash = 2166136261;
  for (const char of JSON.stringify(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function imageView(image, fallbackId, prompt, batchId) {
  const data = image?.data_url || image?.image_data_url || image?.image || "";
  return {
    image_id: "local:image:" + (image?.id || fallbackId),
    preview_url: blobUrl(data),
    download_url: data,
    positive_prompt: prompt?.positive_prompt || "",
    prompt_preview: prompt?.positive_prompt || "",
    negative_prompt: prompt?.negative_prompt || "",
    metadata: prompt?.params || {},
    batch_id: batchId,
    is_favorite: 0,
  };
}

function normalizePackage(pkg) {
  const gallery = Array.isArray(pkg.gallery) ? pkg.gallery : [];
  const prompts = Array.isArray(pkg.prompts) ? pkg.prompts : [];
  const images = Array.isArray(pkg.images) ? pkg.images : [];
  const promptMap = new Map(prompts.map((p) => [p.collection_id || p.id, p]));
  const imageMap = new Map(images.map((i) => [i.collection_id || i.id, i]));
  const stamp = Date.now();
  const importKey = stableId(pkg);
  const batchId = "local:gallery:" + importKey;
  const galleryImages = gallery.map((entry, index) => imageView(imageMap.get(entry.collection_id) || entry, entry.collection_id || index, promptMap.get(entry.collection_id) || entry, batchId));
  const records = [{
    id: batchId,
    type: "gallery",
    batch_id: batchId,
    batch_name: "本地导入",
    notes: "仅保存在当前浏览器",
    cover: galleryImages[0]?.preview_url || "",
    created_at: pkg.exportedAt || new Date().toISOString(),
    images: galleryImages,
    imported_at: stamp,
  }];
  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    const image = imageMap.get(p.collection_id) || gallery[i] || {};
    const data = image.data_url || image.image_data_url || image.image || "";
    records.push({
      id: "local:prompt:" + importKey + ":" + (p.id || p.collection_id || i), type: "prompt",
      title: p.title || "未命名", content: p.positive_prompt || "", negative_prompt: p.negative_prompt || "",
      params: p.params || {}, images: data ? [data] : [], first_image: data, image_count: data ? 1 : 0,
      created_at: pkg.exportedAt || new Date().toISOString(), imported_at: stamp,
    });
  }
  for (const v of Array.isArray(pkg.vibes) ? pkg.vibes : []) {
    records.push({
      id: "local:vibe:" + importKey + ":" + (v.id || v.name || Math.random().toString(36).slice(2)), type: "vibe",
      title: v.name || "未命名 Vibe", content: [v.model && "Model: " + v.model, v.strength != null && "Strength: " + v.strength].filter(Boolean).join("\n"),
      images: v.thumbnail ? [v.thumbnail] : [], first_image: v.thumbnail || "", files: v.data ? [{ name: (v.name || "vibe") + "." + (v.type || "bin"), data: v.data, type: v.type || "application/octet-stream" }] : [],
      file_count: v.data ? 1 : 0, created_at: pkg.exportedAt || new Date().toISOString(), imported_at: stamp,
    });
  }
  return records;
}

export async function importZip(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = unzipSync(bytes);
  const jsonEntry = Object.keys(entries).find((name) => name.toLowerCase().endsWith(".json"));
  if (!jsonEntry) throw new Error("压缩包中没有 JSON 导入文件");
  let pkg;
  try { pkg = JSON.parse(strFromU8(entries[jsonEntry])); } catch { throw new Error("JSON 文件无法解析"); }
  if (pkg.format !== "nai-preset-switcher-gallery-export" || Number(pkg.version) !== 1) throw new Error("不是兼容的 NAI 画廊导出文件");
  const records = normalizePackage(pkg);
  const existing = await readAll();
  const existingIds = new Set(existing.map((r) => r.id));
  let imported = 0; let skipped = 0;
  for (const record of records) {
    if (existingIds.has(record.id)) { skipped++; continue; }
    await put(record); imported++;
  }
  refresh(await readAll());
  window.dispatchEvent(new CustomEvent("nai-gallery:local-changed"));
  return { imported, skipped, gallery: records[0]?.images?.length || 0, prompts: records.filter((r) => r.type === "prompt").length, vibes: records.filter((r) => r.type === "vibe").length };
}

export async function deleteLocalRecord(id) {
  if (!isLocalId(id)) return;
  await remove(id);
  refresh(await readAll());
  window.dispatchEvent(new CustomEvent("nai-gallery:local-changed"));
}

export async function clearLocalRecords(type = "all") {
  const records = await readAll();
  for (const record of records) if (type === "all" || record.type === type) await remove(record.id);
  refresh(await readAll());
  window.dispatchEvent(new CustomEvent("nai-gallery:local-changed"));
}

export async function getLocalRecord(id) {
  await initLocalImport();
  return [...state.gallery, ...state.prompts, ...state.vibes].find((r) => r.id === id) || null;
}

export function downloadLocalFile(file) {
  const blob = dataUrlToBlob(file.data) || new Blob([file.data || ""], { type: file.type || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = file.name || "vibe.bin"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
