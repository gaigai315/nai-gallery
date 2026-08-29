function parseObject(value) {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function textValue(textFields, name) {
  if (!textFields || typeof textFields !== "object") return null;
  const wanted = name.toLowerCase();
  const key = Object.keys(textFields).find((candidate) => candidate.toLowerCase() === wanted);
  const value = key ? textFields[key] : null;
  return Array.isArray(value) ? value[0] : value;
}

function displayValue(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function normalizeNaiMetadata(value) {
  const parsed = parseObject(value) || {};
  if (parsed.stored && typeof parsed.stored === "object") return parsed.stored;
  if (parsed.raw && typeof parsed.raw === "object") {
    return {
      ...parsed.raw,
      ...(parsed._png_text ? { _png_text: parsed._png_text } : {}),
    };
  }
  return parsed;
}

export function getNaiParameterRows(value, fallback = {}) {
  const meta = normalizeNaiMetadata(value);
  const pngText = meta._png_text || {};
  const width = firstValue(meta.width, fallback.width);
  const height = firstValue(meta.height, fallback.height);
  const resolution = width != null && height != null ? `${width} x ${height}` : null;

  const definitions = [
    ["Title", firstValue(textValue(pngText, "title"), meta.title)],
    ["Software", firstValue(textValue(pngText, "software"), meta.software)],
    ["Source", firstValue(textValue(pngText, "source"), meta.source, meta.model)],
    ["Request Type", firstValue(meta.request_type, meta.requestType)],
    ["Resolution", resolution],
    ["Seed", firstValue(meta.seed, fallback.seed)],
    ["Steps", firstValue(meta.steps, fallback.steps)],
    ["Sampler", firstValue(meta.sampler, fallback.sampler)],
    ["Noise Schedule", firstValue(meta.noise_schedule, fallback.noise_schedule)],
    ["Prompt Guidance", firstValue(meta.scale, meta.cfg_scale, fallback.cfg_scale)],
    ["Prompt Guidance Rescale", firstValue(meta.cfg_rescale, meta.guidance_rescale)],
    ["Undesired Content Strength", firstValue(meta.uncond_scale, meta.uc_scale)],
  ];

  return definitions
    .filter(([, fieldValue]) => fieldValue !== undefined && fieldValue !== null && fieldValue !== "")
    .map(([label, fieldValue]) => ({ label, value: displayValue(fieldValue) }));
}

export function formatNaiRawMetadata(value) {
  const meta = normalizeNaiMetadata(value);
  if (!Object.keys(meta).length) return "";
  try {
    return JSON.stringify(meta, null, 2);
  } catch {
    return "";
  }
}
