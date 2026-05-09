import { json } from '@sveltejs/kit';
import { searchInEngine } from '$lib/server/readingEngine.js';
import { clientIp, rateLimit, rateLimitResponse } from '$lib/server/rateLimit.js';

const QUERY_MAX = 64;

export async function GET(event) {
  const { url, locals } = event;
  const key = locals.user?.id ? `search:u:${locals.user.id}` : `search:ip:${clientIp(event)}`;
  const limit = rateLimit(key, { limit: 60, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  const q = String(url.searchParams.get('q') || '').slice(0, QUERY_MAX);
  return json(searchInEngine(q));
}
