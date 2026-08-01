import { json } from '@sveltejs/kit';
import {
  acceptFriendRequest,
  listFriendRequests,
  listFriends,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
  ensureFriendIndexes
} from '$lib/server/friends.js';
import { sendRoomInvite, getRoomInvites, dismissRoomInvite } from '$lib/server/gameService.js';
import { rateLimit, rateLimitResponse } from '$lib/server/rateLimit.js';

const NICK_MAX = 24;
const ROOM_RE = /^[A-Z]{2}$/;

function requireUser(locals) {
  if (!locals.user) return json({ error: 'unauthenticated' }, { status: 401 });
  if (locals.user.isGuest) return json({ error: 'guest_forbidden' }, { status: 403 });
  return null;
}

export async function GET({ locals }) {
  const denied = requireUser(locals);
  if (denied) return denied;

  await ensureFriendIndexes();
  const [friends, requests, invites] = await Promise.all([
    listFriends(locals.user.id),
    listFriendRequests(locals.user.id),
    Promise.resolve(getRoomInvites(locals.user.nickname))
  ]);
  return json({ friends, ...requests, invites });
}

export async function POST({ request, locals }) {
  const denied = requireUser(locals);
  if (denied) return denied;

  const limit = rateLimit(`friends:${locals.user.id}`, { limit: 40, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfter);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, { status: 400 });
  }

  const action = String(body?.action || 'add');
  const nickname = String(body?.nickname || '').trim().slice(0, NICK_MAX);

  try {
    await ensureFriendIndexes();

    if (action === 'add') {
      if (!nickname) return json({ error: 'invalid_nickname' }, { status: 400 });
      const result = await sendFriendRequest({
        fromUserId: locals.user.id,
        fromNickname: locals.user.nickname,
        toNickname: nickname
      });
      return json(result);
    }

    if (action === 'accept') {
      if (!nickname) return json({ error: 'invalid_nickname' }, { status: 400 });
      return json(await acceptFriendRequest({
        userId: locals.user.id,
        nickname: locals.user.nickname,
        fromNickname: nickname
      }));
    }

    if (action === 'reject') {
      if (!nickname) return json({ error: 'invalid_nickname' }, { status: 400 });
      return json(await rejectFriendRequest({ userId: locals.user.id, fromNickname: nickname }));
    }

    if (action === 'remove') {
      if (!nickname) return json({ error: 'invalid_nickname' }, { status: 400 });
      return json(await removeFriend({ userId: locals.user.id, friendNickname: nickname }));
    }

    if (action === 'invite') {
      const room = String(body?.room || '').toUpperCase();
      if (!ROOM_RE.test(room) || !nickname) {
        return json({ error: 'invalid' }, { status: 400 });
      }
      const friends = await listFriends(locals.user.id);
      if (!friends.some((f) => f.nickname === nickname)) {
        return json({ error: 'not_friend' }, { status: 403 });
      }
      return json(sendRoomInvite({
        from: locals.user.nickname,
        to: nickname,
        room,
        roomName: String(body?.roomName || '').slice(0, 32)
      }));
    }

    if (action === 'dismissInvite') {
      const room = String(body?.room || '').toUpperCase();
      if (!ROOM_RE.test(room)) return json({ error: 'invalid_room' }, { status: 400 });
      dismissRoomInvite(locals.user.nickname, room);
      return json({ ok: true });
    }

    return json({ error: 'unknown_action' }, { status: 400 });
  } catch (error) {
    const code = error?.message || 'failed';
    const status = code === 'user_not_found' ? 404 : code === 'not_friend' ? 403 : 400;
    return json({ error: code }, { status });
  }
}
