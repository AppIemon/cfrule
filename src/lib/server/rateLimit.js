// In-memory fixed-window rate limiter.
// Caveat: on Vercel each serverless instance has its own counters, so the effective
// limit is per-instance. Good enough to throttle a single abusive client; for shared
// global limits switch to Upstash Redis or similar.

const buckets = new Map();
const PURGE_INTERVAL_MS = 60_000;
let lastPurge = Date.now();

function purge(now) {
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  purge(now);
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}

export function clientIp(event) {
  try {
    return event.getClientAddress();
  } catch {
    return event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  }
}

export function rateLimitResponse(retryAfter) {
  return new Response(JSON.stringify({ error: 'rate_limited' }), {
    status: 429,
    headers: {
      'content-type': 'application/json',
      'retry-after': String(retryAfter)
    }
  });
}
