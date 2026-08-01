import { json } from '@sveltejs/kit';
import { rankingSnapshot } from '$lib/server/gameService.js';

export async function GET({ locals }) {
  if (!locals.user?.nickname) return json({ message: 'unauthenticated' }, { status: 401 });
  if (locals.user.isGuest) return json({ message: 'guest_forbidden' }, { status: 403 });
  return json(await rankingSnapshot());
}
