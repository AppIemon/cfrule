import { json } from '@sveltejs/kit';
import { sendCommand } from '$lib/server/gameService.js';

export async function POST({ request }) {
  try {
    return json(await sendCommand(await request.json()));
  } catch (error) {
    console.error('action POST failed', error);
    return json({ message: error?.message || 'Internal Error' }, { status: 500 });
  }
}
