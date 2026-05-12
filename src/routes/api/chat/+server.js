import { json } from '@sveltejs/kit';
import { addChatMessage } from '$lib/server/gameService.js';
import { rateLimit, rateLimitResponse } from '$lib/server/rateLimit.js';

const ROOM_RE = /^[A-F0-9]{6}$/;
const TEXT_MAX = 500;

export async function POST({ request, locals }) {
  if (!locals.user?.nickname) {
    return json({ message: 'unauthenticated' }, { status: 401 });
  }

  const limit = rateLimit(`chat:${locals.user.id}`, { limit: 60, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ message: 'invalid_json' }, { status: 400 });
  }

  const room = String(body?.room || '').trim().toUpperCase();
  const text = String(body?.text || '').trim().slice(0, TEXT_MAX);
  if (!ROOM_RE.test(room)) return json({ message: 'invalid_room' }, { status: 400 });
  if (!text) return json({ message: 'invalid_text' }, { status: 400 });

  return json(await addChatMessage({ room, nickname: locals.user.nickname, text }));
}
