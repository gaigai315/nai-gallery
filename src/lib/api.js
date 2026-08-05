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

  let data;
  try {
    data = await res.json();
  } catch {
    throw new ApiError("Invalid JSON response", "parse_error", res.status);
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
