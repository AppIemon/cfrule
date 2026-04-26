import { json } from '@sveltejs/kit';
import { createRoom, getRoomSnapshot, joinRoom } from '$lib/server/gameService.js';

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
    return json(await getRoomSnapshot(url.searchParams.get('room') || ''));
  } catch (error) {
    console.error('room GET failed', error);
    return json({ message: error?.message || 'Internal Error' }, { status: 500 });
  }
}
