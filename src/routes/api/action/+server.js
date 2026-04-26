import { json } from '@sveltejs/kit';
import { sendCommand } from '$lib/server/gameService.js';

export async function POST({ request }) {
  return json(await sendCommand(await request.json()));
}
