import { json } from '@sveltejs/kit';
import { searchWords } from '$lib/server/botEngine.js';
import { clientIp, rateLimit, rateLimitResponse } from '$lib/server/rateLimit.js';

const QUERY_MAX = 32;
const USED_MAX = 4096;

export async function GET(event) {
  const { url, locals } = event;
  const key = locals.user?.id ? `wordsearch:u:${locals.user.id}` : `wordsearch:ip:${clientIp(event)}`;
  const rl = rateLimit(key, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const q = String(url.searchParams.get('q') || '').trim().slice(0, QUERY_MAX);
  const start = String(url.searchParams.get('start') || '').trim().slice(0, 1);
  const limit = Math.min(100, Math.max(10, Number(url.searchParams.get('limit') || 50)));
  const used = String(url.searchParams.get('used') || '')
    .slice(0, USED_MAX)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  return json(await searchWords({ q, start, used, limit }));
}
