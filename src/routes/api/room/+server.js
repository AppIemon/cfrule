import { json } from '@sveltejs/kit';
import { createRoom, getRoomSnapshot, joinRoom } from '$lib/server/gameService.js';

export async function POST({ request }) {
  const body = await request.json();
  const action = body.action || 'create';
  if (action === 'join') return json(await joinRoom(body));
  return json(await createRoom(body));
}

export async function GET({ url }) {
  return json(await getRoomSnapshot(url.searchParams.get('room') || ''));
}
