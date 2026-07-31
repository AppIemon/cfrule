import { json } from '@sveltejs/kit';
import { chainEngineStart, chainEnginePlay, chainEngineState, chainEngineQuit } from '$lib/server/botEngine.js';
import { rateLimit, rateLimitResponse } from '$lib/server/rateLimit.js';

// Standalone D1~D20 chain-engine battle (사람 선공 vs 채린컴퓨터 후공), the same
// retrograde solver as the deploy 전수 평가기. One session per user.
function roomFor(user) {
  return `ENGINE-${user.id}`;
}

export async function GET({ locals }) {
  if (!locals.user?.nickname) return json({ error: 'unauthenticated' }, { status: 401 });
  return json({ state: await chainEngineState(roomFor(locals.user), locals.user.nickname) });
}

export async function POST({ request, locals }) {
  if (!locals.user?.nickname) return json({ error: 'unauthenticated' }, { status: 401 });
  const limit = rateLimit(`engine-battle:${locals.user.id}`, { limit: 60, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, { status: 400 });
  }

  const room = roomFor(locals.user);
  const sender = locals.user.nickname;
  const action = body?.action || 'state';
  try {
    if (action === 'start') {
      return json(await chainEngineStart(room, sender, {
        depth: body?.depth,
        chain: body?.chain === 'prefix' ? 'prefix' : 'end',
        dict: String(body?.dict || 'roble').slice(0, 16)
      }));
    }
    if (action === 'play') {
      return json(await chainEnginePlay(room, sender, String(body?.input || '').slice(0, 40)));
    }
    if (action === 'quit') {
      return json(await chainEngineQuit(room, sender));
    }
    return json({ state: await chainEngineState(room, sender) });
  } catch (error) {
    return json({ error: error?.message || 'engine_error' }, { status: 500 });
  }
}
