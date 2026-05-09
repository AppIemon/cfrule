import { json } from '@sveltejs/kit';
import { addDirectMessage, getDirectMessages, getDMInbox } from '$lib/server/gameService.js';
import { rateLimit, rateLimitResponse } from '$lib/server/rateLimit.js';

const TEXT_MAX = 500;
const TARGET_MAX = 32;

export async function GET({ url, locals }) {
  if (!locals.user) return json({ error: 'unauthenticated' }, { status: 401 });

  const withUser = url.searchParams.get('with');
  if (withUser) {
    const messages = getDirectMessages(locals.user.nickname, String(withUser).slice(0, TARGET_MAX));
    return json({ messages });
  }

  const inbox = getDMInbox(locals.user.nickname);
  return json({ inbox });
}

export async function POST({ request, locals }) {
  if (!locals.user) return json({ error: 'unauthenticated' }, { status: 401 });

  const limit = rateLimit(`dm:${locals.user.id}`, { limit: 30, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, { status: 400 });
  }

  const to = String(body?.to || '').trim().slice(0, TARGET_MAX);
  const text = String(body?.text || '').trim().slice(0, TEXT_MAX);
  if (!to || !text) return json({ error: 'invalid' }, { status: 400 });
  if (to === locals.user.nickname) return json({ error: 'cannot dm yourself' }, { status: 400 });

  addDirectMessage({ from: locals.user.nickname, to, text });
  return json({ ok: true });
}
