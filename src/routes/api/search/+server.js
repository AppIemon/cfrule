import { json } from '@sveltejs/kit';
import { getBotEngine } from '$lib/server/botEngine.js';
import { getDictSearchScope } from '$lib/server/dictPools.js';
import { searchInEngine } from '$lib/server/readingEngine.js';
import { clientIp, rateLimit, rateLimitResponse } from '$lib/server/rateLimit.js';

const QUERY_MAX = 64;

export async function GET(event) {
  const { url, locals } = event;
  const key = locals.user?.id ? `search:u:${locals.user.id}` : `search:ip:${clientIp(event)}`;
  const limit = rateLimit(key, { limit: 60, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  const q = String(url.searchParams.get('q') || '').slice(0, QUERY_MAX);
  const dict = String(url.searchParams.get('dict') || 'default').trim().slice(0, 16).toLowerCase();
  if (dict === 'default') return json(searchInEngine(q));

  const bot = await getBotEngine();
  const scope = getDictSearchScope(bot.context, dict);
  if (!scope) return json({ query: q, dict, total: 0, results: [] });
  return json({ ...searchInEngine(q, 200, scope), dict });
}
