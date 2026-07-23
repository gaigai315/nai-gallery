const stores = new Map();
let lastFullCleanup = 0;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function now() {
  return Date.now();
}

export function checkLimit(key, windowMs, maxAttempts) {
  if (!stores.has(key)) stores.set(key, []);
  const timestamps = stores.get(key);

  const cutoff = now() - windowMs;
  while (timestamps.length > 0 && timestamps[0] < cutoff) {
    timestamps.shift();
  }

  if (timestamps.length >= maxAttempts) {
    const retryAfter = Math.ceil((timestamps[0] + windowMs - now()) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  timestamps.push(now());

  // Delete the current key if its array is now empty
  if (timestamps.length === 0) {
    stores.delete(key);
  }

  // Lazy full cleanup: scan all keys every 5 minutes
  if (now() - lastFullCleanup > CLEANUP_INTERVAL_MS) {
    for (const [k, ts] of stores) {
      const cut = now() - CLEANUP_INTERVAL_MS;
      while (ts.length > 0 && ts[0] < cut) ts.shift();
      if (ts.length === 0) stores.delete(k);
    }
    lastFullCleanup = now();
  }

  return { allowed: true };
}

export function rateLimitResponse(retryAfter) {
  return new Response(
    JSON.stringify({ error: "rate_limited", retry_after: retryAfter }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfter),
      },
    },
  );
}
