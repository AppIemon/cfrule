import { json } from '@sveltejs/kit';
import { analyzeReading, analyzeByType } from '$lib/server/readingEngine.js';
import { clientIp, rateLimit, rateLimitResponse } from '$lib/server/rateLimit.js';

const SITUATION_MAX = 4000;
const HISTORY_MAX = 500;
const SYLLABLE_MAX = 4;
const JOB_MAX = 24;

export async function POST(event) {
  const { request, locals } = event;
  const key = locals.user?.id ? `analysis:u:${locals.user.id}` : `analysis:ip:${clientIp(event)}`;
  const limit = rateLimit(key, { limit: 30, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, { status: 400 });
  }

  const sanitized = {
    attackerJob: String(body?.attackerJob || '').slice(0, JOB_MAX),
    defenderJob: String(body?.defenderJob || '').slice(0, JOB_MAX),
    syllable: String(body?.syllable || '').slice(0, SYLLABLE_MAX),
    situation: String(body?.situation || '').slice(0, SITUATION_MAX),
    history: Array.isArray(body?.history)
      ? body.history.slice(0, HISTORY_MAX).map((item) => String(item).slice(0, 32))
      : [],
    type: body?.type
  };

  if (sanitized.type === 'I' || sanitized.type === 'R' || sanitized.type === 'A' || sanitized.type === 'K') {
    return json(analyzeByType(sanitized));
  }
  return json(analyzeReading(sanitized));
}
