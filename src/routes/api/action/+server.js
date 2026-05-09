import { json } from '@sveltejs/kit';
import { sendCommand } from '$lib/server/gameService.js';
import { rateLimit, rateLimitResponse } from '$lib/server/rateLimit.js';

const ROOM_RE = /^[A-F0-9]{6}$/;
const COMMAND_MAX = 256;

export async function POST({ request, locals }) {
  if (!locals.user?.nickname) {
    return json({ message: 'unauthenticated' }, { status: 401 });
  }
  const limit = rateLimit(`action:${locals.user.id}`, { limit: 30, windowMs: 10_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ message: 'invalid_json' }, { status: 400 });
  }

  const room = String(body?.room || '').toUpperCase();
  if (!ROOM_RE.test(room)) return json({ message: 'invalid_room' }, { status: 400 });

  const command = String(body?.command || '');
  if (command.length > COMMAND_MAX) return json({ message: 'command_too_long' }, { status: 400 });

  try {
    return json(await sendCommand({ room, nickname: locals.user.nickname, command }));
  } catch (error) {
    console.error('action POST failed', error);
    return json({ message: error?.message || 'Internal Error' }, { status: 500 });
  }
}
