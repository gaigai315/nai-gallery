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

export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new ApiError("Invalid JSON response", "parse_error", res.status);
  }

  if (!res.ok) {
    const code = data?.error || `http_${res.status}`;
    throw new ApiError(data?.error || `Request failed (${res.status})`, code, res.status);
  }

  return data;
}
