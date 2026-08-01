import { json } from '@sveltejs/kit';
import { createRoom, getRoomSnapshot, joinRoom, leaveRoom, listRooms, setRoomReady, startRoomGame } from '$lib/server/gameService.js';
import { rateLimit, rateLimitResponse } from '$lib/server/rateLimit.js';

const ROOM_RE = /^[A-F0-9]{6}$/;
const CPU_JOB_MAX = 24;

export async function POST({ request, locals }) {
  if (!locals.user?.nickname) {
    return json({ message: 'unauthenticated' }, { status: 401 });
  }
  const limit = rateLimit(`room:${locals.user.id}`, { limit: 20, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ message: 'invalid_json' }, { status: 400 });
  }

  const action = body?.action || 'create';
  const nickname = locals.user.nickname;

  try {
    if (action === 'join') {
      const room = String(body?.room || '').toUpperCase();
      if (!ROOM_RE.test(room)) return json({ message: 'invalid_room' }, { status: 400 });
      return json(await joinRoom({ room, nickname }));
    }
    if (action === 'ready') {
      const room = String(body?.room || '').toUpperCase();
      if (!ROOM_RE.test(room)) return json({ message: 'invalid_room' }, { status: 400 });
      return json(await setRoomReady({ room, nickname, ready: body?.ready !== false }));
    }
    if (action === 'start') {
      const room = String(body?.room || '').toUpperCase();
      if (!ROOM_RE.test(room)) return json({ message: 'invalid_room' }, { status: 400 });
      return json(await startRoomGame({ room, nickname }));
    }
    if (action === 'leave') {
      const room = String(body?.room || '').toUpperCase();
      if (!ROOM_RE.test(room)) return json({ message: 'invalid_room' }, { status: 400 });
      const result = await leaveRoom({ room, nickname });
      if (result?.left) return json({ left: true, room: '' });
      return json(result);
    }

    const mode = Number(body?.mode);
    return json(await createRoom({
      nickname,
      mode: Number.isFinite(mode) ? mode : 1,
      practice: !!body?.practice,
      cpuJob: String(body?.cpuJob || '').slice(0, CPU_JOB_MAX),
      timer: body?.timer,
      disabledJobs: body?.disabledJobs,
      combat: !!body?.combat,
      dictSource: String(body?.dictSource || 'default'),
      gameMode: String(body?.gameMode || 'guerule'),
      searchAllowed: !!body?.searchAllowed,
      cpuLevel: String(body?.cpuLevel || ''),
      cpuThink: !!body?.cpuThink,
      chainMode: body?.chainMode === 'start' ? 'start' : 'end',
      duEum: body?.duEum !== false,
      rated: body?.rated !== false,
      pyohanLives: Number(body?.pyohanLives) || 3,
      geonmatRounds: Number(body?.geonmatRounds) || 5
    }));
  } catch (error) {
    console.error('room POST failed', error);
    return json({ message: error?.message || 'Internal Error' }, { status: 500 });
  }
}

export async function GET({ url }) {
  try {
    const room = String(url.searchParams.get('room') || '').toUpperCase();
    if (url.searchParams.get('action') === 'list' || !room) {
      return json(await listRooms());
    }
    if (room && !ROOM_RE.test(room)) return json({ message: 'invalid_room' }, { status: 400 });
    return json(await getRoomSnapshot(room));
  } catch (error) {
    console.error('room GET failed', error);
    return json({ message: error?.message || 'Internal Error' }, { status: 500 });
  }
}
