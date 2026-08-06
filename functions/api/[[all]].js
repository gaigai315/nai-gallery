import { json } from "../_lib/session.js";

/**
 * 兜底路由：任何未匹配到具体函数文件的 /api/* 请求（路径不存在、
 * 方法不匹配、函数缺失等）都返回 JSON 404。
 *
 * 背景：Cloudflare Pages 的 SPA 兜底会让未匹配请求返回 200 + index.html，
 * 前端 apiFetch 拿到 HTML 后就会报“JSON 解析失败”。本路由把这类请求
 * 统一变成 JSON 错误，便于前端给出明确提示（例如 404 资源不存在）。
 */
export async function onRequest({ request }) {
  return json({ error: "not_found", detail: "API route not found" }, 404);
}
