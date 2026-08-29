/**
 * Browser-side NAI PNG metadata parser.
 * Reads tEXt / iTXt chunks from a File and extracts NovelAI generation parameters.
 * Zero dependencies — pure DataView + TextDecoder.
 *
 * Returns a normalized NaiMeta object, or null when the PNG is not recognized as NAI.
 */

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const MAX_TEXT_VALUE = 2 * 1024 * 1024; // 2 MB safety cap per chunk value
const HEAD_CAP = 4 * 1024 * 1024; // 4 MB head is plenty for tEXt

const TYPE_tEXt = 0x74455874;
const TYPE_iTXt = 0x69545874;
const TYPE_IEND = 0x49454e44;

const NAI_HINT_KEYS = new Set([
  "prompt", "steps", "sampler", "seed", "scale", "uc",
  "noise_schedule", "uncond_scale", "ucPreset", "n_samples",
]);

function checkSignature(buf) {
  if (buf.byteLength < 8) return false;
  const dv = new DataView(buf, 0, 8);
  for (let i = 0; i < 8; i++) {
    if (dv.getUint8(i) !== PNG_SIG[i]) return false;
  }
  return true;
}

function* iterTextChunks(buf) {
  const dv = new DataView(buf);
  let offset = 8;
  const len = buf.byteLength;
  while (offset + 8 <= len) {
    const dataLen = dv.getUint32(offset, false);
    const type = dv.getUint32(offset + 4, false);
    if (type === TYPE_IEND) break;
    const dataStart = offset + 8;
    const dataEnd = dataStart + dataLen;
    if (dataEnd + 4 > len) break;
    if (type === TYPE_tEXt || type === TYPE_iTXt) {
      yield { type, dataStart, dataLen };
    }
    offset = dataEnd + 4;
  }
}

function stripBom(str) {
  if (str.charCodeAt(0) === 0xfeff) return str.slice(1);
  return str;
}

function decodeTex(bytes, dataStart, dataLen) {
  if (dataLen === 0) return { keyword: "", value: "" };
  let sep = -1;
  for (let i = dataStart; i < dataStart + dataLen; i++) {
    if (bytes[i] === 0) { sep = i; break; }
  }
  const kwEnd = sep === -1 ? dataStart + dataLen : sep;
  const kw = new TextDecoder("latin1").decode(bytes.subarray(dataStart, kwEnd));
  let valueBytes = sep === -1
    ? new Uint8Array(0)
    : bytes.subarray(sep + 1, dataStart + dataLen);
  if (valueBytes.length > MAX_TEXT_VALUE) {
    valueBytes = valueBytes.subarray(0, MAX_TEXT_VALUE);
  }
  let value;
  try {
    value = stripBom(new TextDecoder("utf-8", { fatal: true }).decode(valueBytes));
  } catch {
    value = stripBom(new TextDecoder("latin1").decode(valueBytes));
  }
  return { keyword: kw, value };
}

function decodeItxt(bytes, dataStart, dataLen) {
  if (dataLen === 0) return { keyword: "", value: "" };
  let i = dataStart;
  const end = dataStart + dataLen;
  let kwEnd = end;
  for (; i < end; i++) { if (bytes[i] === 0) { kwEnd = i; break; } }
  i = kwEnd + 1;
  if (i + 2 > end) return { keyword: "", value: "" };
  const compFlag = bytes[i];
  i += 2;
  for (; i < end; i++) { if (bytes[i] === 0) break; }
  i++;
  for (; i < end; i++) { if (bytes[i] === 0) break; }
  i++;
  if (compFlag !== 0 || i > end) return { keyword: "", value: "" };
  let valueBytes = bytes.subarray(i, end);
  if (valueBytes.length > MAX_TEXT_VALUE) valueBytes = valueBytes.subarray(0, MAX_TEXT_VALUE);
  let value;
  try {
    value = stripBom(new TextDecoder("utf-8", { fatal: true }).decode(valueBytes));
  } catch {
    value = stripBom(new TextDecoder("latin1").decode(valueBytes));
  }
  const keyword = new TextDecoder("utf-8").decode(bytes.subarray(dataStart, kwEnd));
  return { keyword, value };
}

function tryParseJson(value) {
  const trimmed = value.trim();
  if (!trimmed || !(trimmed.startsWith("{") || trimmed.startsWith("["))) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function normalizeTextFields(textChunks) {
  const fields = {};
  for (const { keyword, value } of textChunks) {
    const key = keyword.trim();
    if (!key || key.toLowerCase() === "comment") continue;
    if (fields[key] == null) {
      fields[key] = value;
    } else if (Array.isArray(fields[key])) {
      fields[key].push(value);
    } else {
      fields[key] = [fields[key], value];
    }
  }
  return fields;
}

function findTextField(textFields, name) {
  const wanted = name.toLowerCase();
  const key = Object.keys(textFields).find((candidate) => candidate.toLowerCase() === wanted);
  const value = key ? textFields[key] : null;
  return Array.isArray(value) ? value[0] : value;
}

function buildStoredMetadata(raw, textFields) {
  const stored = { ...raw };
  if (Object.keys(textFields).length) stored._png_text = textFields;
  return stored;
}

function normalizeNaiMeta(raw, textFields = {}) {
  if (!raw || typeof raw !== "object") return null;
  const hasHint = Object.keys(raw).some((k) => NAI_HINT_KEYS.has(k));
  if (!hasHint) return null;
  return {
    positive_prompt: String(raw.prompt || ""),
    negative_prompt: String(raw.uc || ""),
    seed: raw.seed != null ? String(raw.seed) : null,
    steps: raw.steps != null ? raw.steps : null,
    cfg_scale: raw.scale != null ? raw.scale : null,
    sampler: raw.sampler || null,
    noise_schedule: raw.noise_schedule || null,
    width: raw.width != null ? raw.width : null,
    height: raw.height != null ? raw.height : null,
    title: findTextField(textFields, "title") || null,
    description: findTextField(textFields, "description") || null,
    software: findTextField(textFields, "software") || null,
    source: findTextField(textFields, "source") || null,
    raw,
    stored: buildStoredMetadata(raw, textFields),
  };
}

/**
 * Parse a File (or Blob) as an NAI PNG.
 * @param {File|Blob} file
 * @returns {Promise<NaiMeta|null>}
 */
export async function parseNaiPng(file) {
  const sliceEnd = Math.min(file.size, HEAD_CAP);
  const buf = await file.slice(0, sliceEnd).arrayBuffer();
  if (!checkSignature(buf)) return null;

  const bytes = new Uint8Array(buf);
  let commentJson = null;
  let description = null;
  const textChunks = [];

  for (const chunk of iterTextChunks(buf)) {
    const decoded = chunk.type === TYPE_tEXt
      ? decodeTex(bytes, chunk.dataStart, chunk.dataLen)
      : decodeItxt(bytes, chunk.dataStart, chunk.dataLen);
    const { keyword, value } = decoded;
    if (!value) continue;
    textChunks.push({ keyword, value });
    const kwLower = keyword.toLowerCase();

    if (kwLower === "comment" && !commentJson) {
      const parsed = tryParseJson(value);
      if (parsed) { commentJson = parsed; continue; }
    }
    if (!commentJson && (!keyword || kwLower === "description")) {
      const parsed = tryParseJson(value);
      if (parsed) { commentJson = parsed; continue; }
    }
    if (kwLower === "description" && !description) {
      description = value;
    }
  }

  const textFields = normalizeTextFields(textChunks);
  if (commentJson) {
    const meta = normalizeNaiMeta(commentJson, textFields);
    if (meta) return meta;
  }
  if (description) {
    const raw = { description };
    return {
      positive_prompt: "", negative_prompt: "",
      seed: null, steps: null, cfg_scale: null,
      sampler: null, noise_schedule: null,
      width: null, height: null,
      title: findTextField(textFields, "title") || null,
      description,
      software: findTextField(textFields, "software") || null,
      source: findTextField(textFields, "source") || null,
      raw,
      stored: buildStoredMetadata(raw, textFields),
    };
  }
  return null;
}

export default parseNaiPng;
