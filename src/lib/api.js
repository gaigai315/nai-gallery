/**
 * Lightweight fetch wrapper with unified error handling for the NAI Gallery API.
 * All calls include credentials (cookies for session auth).
 */

class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

import { addToast } from "../stores/toast.js";

const ERROR_MESSAGES = {
  rate_limited: ["操作太频繁，请稍后再试", "warning"],
  login_required: ["请先登录", "error"],
  admin_required: ["权限不足", "error"],
  not_found: ["资源不存在", "warning"],
  parse_error: ["数据解析失败", "error"],
};

export async function apiFetch(url, options = {}) {
  const silent = options.silent;
  delete options.silent;

  let res;
  try {
    res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  } catch {
    if (!silent) addToast("网络连接失败", "error");
    throw new ApiError("Network error", "network_error", 0);
  }

  let data = null;
  // 先看 Content-Type 再决定解析方式：避免把 HTML 错误页 / SPA 兜底页
  // 误报成笼统的“JSON 解析失败”，而是给出真实状态码和响应类型。
  const contentType = res.headers.get("content-type") || "";
  const isJsonType = contentType.includes("json");

  if (isJsonType || !contentType) {
    try {
      data = await res.json();
    } catch {
      data = null; // 声明是 JSON 但解析失败，或没有 Content-Type 但体不是 JSON
    }
  }

  if (data === null) {
    // 非 JSON 响应（SPA 兜底 HTML、Cloudflare 错误页、限流挑战页等）
    const reason = isJsonType
      ? "JSON 解析失败"
      : `返回了非 JSON 内容 (${contentType || "无 Content-Type"})`;
    const msg = `请求异常 (HTTP ${res.status}, ${reason})`;
    if (!silent) addToast(msg, "error");
    throw new ApiError(msg, "parse_error", res.status);
  }

  if (!res.ok) {
    const code = data?.error || `http_${res.status}`;
    const detail = data?.detail ? `: ${data.detail}` : "";
    if (!silent) {
      const [msg, type] = ERROR_MESSAGES[code] || [data?.error || `请求失败 (${res.status})`, "error"];
      addToast(msg, type);
    }
    throw new ApiError(data?.error ? `${data.error}${detail}` : `Request failed (${res.status})`, code, res.status);
  }

  return data;
}
