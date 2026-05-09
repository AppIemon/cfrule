import { json } from '@sveltejs/kit';
import { createRoom, getRoomSnapshot, joinRoom, listRooms } from '$lib/server/gameService.js';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const action = body.action || 'create';
    if (action === 'join') return json(await joinRoom(body));
    return json(await createRoom(body));
  } catch (error) {
    console.error('room POST failed', error);
    return json({ message: error?.message || 'Internal Error' }, { status: 500 });
  }
}

export async function GET({ url }) {
  try {
    if (url.searchParams.get('action') === 'list' || !url.searchParams.get('room')) {
      return json(await listRooms());
    }
    return json(await getRoomSnapshot(url.searchParams.get('room') || ''));
  } catch (error) {
    console.error('room GET failed', error);
    return json({ message: error?.message || 'Internal Error' }, { status: 500 });
  }
}
