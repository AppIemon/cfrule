import { json } from '@sveltejs/kit';
import { getOngoingGames } from '$lib/server/gameService.js';

export async function GET({ locals }) {
  if (!locals.user?.nickname) return json([]);
  const games = await getOngoingGames(locals.user.nickname);
  return json(games);
}
