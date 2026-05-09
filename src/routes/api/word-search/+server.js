import { json } from '@sveltejs/kit';
import { getBotEngine } from '$lib/server/botEngine.js';
import { clientIp, rateLimit, rateLimitResponse } from '$lib/server/rateLimit.js';

const QUERY_MAX = 32;
const USED_MAX = 4096;

function setToArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    if (typeof value[Symbol.iterator] === 'function') return Array.from(value);
  } catch {}
  return [];
}

function wordKind(context, word) {
  const kinds = [];
  try { if (typeof context.isRoot === 'function' && context.isRoot(word)) kinds.push('루트'); } catch {}
  try { if (typeof context.isHanbang === 'function' && context.isHanbang(word)) kinds.push('한방'); } catch {}
  try { if (typeof context.isYudo === 'function' && context.isYudo(word)) kinds.push('유도'); } catch {}
  return kinds.length ? kinds.join(' · ') : '일반';
}

function getWordPool(context, start) {
  const byStart = context.WORDS_BY_START || context.__Bot?.scope?.WORDS_BY_START;
  if (start && byStart) {
    if (typeof byStart.get === 'function') return setToArray(byStart.get(start));
    if (byStart[start]) return setToArray(byStart[start]);
  }
  return setToArray(context.WORD_SET || context.__Bot?.scope?.WORD_SET);
}

function replyCount(context, word) {
  const end = String(word || '').slice(-1);
  const byStart = context.WORDS_BY_START || context.__Bot?.scope?.WORDS_BY_START;
  try {
    if (typeof context.cpuCountAvailFast === 'function') return context.cpuCountAvailFast(end, null) || 0;
  } catch {}
  if (byStart) {
    if (typeof byStart.get === 'function') return setToArray(byStart.get(end)).length;
    if (byStart[end]) return setToArray(byStart[end]).length;
  }
  return 0;
}

export async function GET(event) {
  const { url, locals } = event;
  const key = locals.user?.id ? `wordsearch:u:${locals.user.id}` : `wordsearch:ip:${clientIp(event)}`;
  const rl = rateLimit(key, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const q = String(url.searchParams.get('q') || '').trim().slice(0, QUERY_MAX);
  const start = String(url.searchParams.get('start') || '').trim().slice(0, 1);
  const limit = Math.min(100, Math.max(10, Number(url.searchParams.get('limit') || 50)));
  const bot = await getBotEngine();
  const context = bot.context;
  const used = new Set(
    String(url.searchParams.get('used') || '')
      .slice(0, USED_MAX)
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  );
  let pool = getWordPool(context, start);

  if (q) pool = pool.filter((word) => String(word || '').includes(q));
  if (start) pool = pool.filter((word) => String(word || '').startsWith(start));
  pool = pool.filter((word) => word && !used.has(word));

  const results = pool
    .slice(0, 5000)
    .map((word) => ({
      word,
      start: String(word).slice(0, 1),
      end: String(word).slice(-1),
      kind: wordKind(context, word),
      replyCount: replyCount(context, word)
    }))
    .sort((a, b) => {
      const score = (row) =>
        (row.kind.includes('루트') ? 10000 : 0) +
        (row.kind.includes('한방') ? 5000 : 0) +
        (row.kind.includes('유도') ? 800 : 0) -
        Math.min(row.replyCount || 0, 200);
      return score(b) - score(a) || a.word.localeCompare(b.word, 'ko');
    })
    .slice(0, limit);

  return json({ q, start, total: pool.length, results });
}
